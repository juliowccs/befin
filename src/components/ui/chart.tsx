"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-text-secondary [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border-subtle/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border-subtle [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border-subtle [&_.recharts-radial-bar-background-sector]:fill-surface-lavender [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-surface-lavender/50 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border-subtle [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

interface TooltipPayloadItem {
  name?: string;
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    valueFormatter?: (value: number) => string;
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelKey,
      nameKey,
      valueFormatter,
    },
    ref,
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const firstPayload = payload[0]?.payload;
    const resolvedLabel = labelKey && firstPayload
      ? String(firstPayload[labelKey] ?? label ?? "")
      : label;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[9rem] items-start gap-1.5 rounded-2xl border border-border-subtle bg-surface/95 px-3 py-2 text-xs shadow-editorial-lg backdrop-blur-md",
          className,
        )}
      >
        {!hideLabel && resolvedLabel && (
          <div className="font-display font-semibold text-primary">
            {resolvedLabel}
          </div>
        )}
        <div className="grid gap-1">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`;
            const itemConfig = config[key];
            const indicatorColor =
              item.color ||
              (firstPayload?.fill as string | undefined) ||
              itemConfig?.color ||
              "var(--color-primary)";
            const numericVal = Number(item.value ?? 0);

            return (
              <div
                key={`${key}-${index}`}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-1.5 text-text-secondary">
                  {!hideIndicator && (
                    <span
                      className={cn(
                        "shrink-0 rounded-[3px]",
                        indicator === "dot" && "h-2.5 w-2.5",
                        indicator === "line" && "h-2.5 w-1",
                        indicator === "dashed" &&
                          "h-2.5 w-0 border-[1.5px] border-dashed bg-transparent",
                      )}
                      style={{ backgroundColor: indicatorColor }}
                    />
                  )}
                  <span>{itemConfig?.label || item.name || key}</span>
                </div>
                <span className="font-mono font-semibold tabular-nums text-primary">
                  {valueFormatter ? valueFormatter(numericVal) : numericVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: Array<{
      value?: string;
      dataKey?: string | number;
      color?: string;
    }>;
    hideIcon?: boolean;
    nameKey?: string;
  }
>(({ className, hideIcon = false, payload, nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 pt-2 text-xs",
        className,
      )}
    >
      {payload.map((item, idx) => {
        const key = `${nameKey || item.dataKey || item.value || "value"}`;
        const itemConfig = config[key];

        return (
          <div key={`${key}-${idx}`} className="flex items-center gap-1.5">
            {!hideIcon && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-text-secondary">
              {itemConfig?.label || item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
};
