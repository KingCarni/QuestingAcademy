import React from "react";
import { cn } from "../lib/cn";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}
export const Card: React.FC<Props> = ({ children, className, hover, ...rest }) => (
  <div className={cn("card-base p-6 md:p-8", hover && "card-hover", className)} {...rest}>
    {children}
  </div>
);
