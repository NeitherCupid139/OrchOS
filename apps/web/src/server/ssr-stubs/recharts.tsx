import type { ReactNode } from "react";

type WrapperProps = {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function Wrapper({ children, className, style }: WrapperProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export type TooltipValueType = number | string;

export type DefaultTooltipContentProps<TValue = TooltipValueType, TName = string | number> = {
  active?: boolean;
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    name?: TName;
    payload?: Record<string, unknown>;
    type?: string;
    value?: TValue;
  }>;
  label?: ReactNode;
};

export type DefaultLegendContentProps = {
  payload?: Array<{
    color?: string;
    dataKey?: string | number;
    value?: string | number;
  }>;
  verticalAlign?: "top" | "bottom" | "middle";
};

export const ResponsiveContainer = Wrapper;
export const BarChart = Wrapper;
export const PieChart = Wrapper;
export const CartesianGrid = Wrapper;
export const XAxis = Wrapper;
export const YAxis = Wrapper;
export const Bar = Wrapper;
export const Pie = Wrapper;
export const Cell = Wrapper;
export const Tooltip = Wrapper;
export const Legend = Wrapper;
