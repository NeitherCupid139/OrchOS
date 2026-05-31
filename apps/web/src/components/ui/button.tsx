import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";

import { playInteractionSound } from "@/lib/audio";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  nativeButton,
  onClick,
  ...props
}: ButtonProps) {
  const resolvedClassName = cn(buttonVariants({ variant, size, className }));
  const playButtonClickSound = (event: Parameters<NonNullable<ButtonPrimitive.Props["onClick"]>>[0]) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      playInteractionSound("button");
    }
  };

  if (asChild) {
    const child = React.Children.only(children);

    if (!React.isValidElement(child)) {
      throw new Error("Button with `asChild` expects a single React element child.");
    }

    const isNativeButton = typeof child.type === "string" && child.type === "button";

    return (
      <ButtonPrimitive
        data-slot="button"
        className={resolvedClassName}
        nativeButton={nativeButton ?? isNativeButton}
        render={child}
        onClick={playButtonClickSound}
        {...props}
      />
    );
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={resolvedClassName}
      nativeButton={nativeButton}
      onClick={playButtonClickSound}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

export { Button };
