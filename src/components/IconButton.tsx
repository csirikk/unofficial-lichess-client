import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "ghost" | "outline" | "solid";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	size?: IconButtonSize;
	variant?: IconButtonVariant;
	"aria-label": string;
	children: ReactNode;
}

const sizeClasses: Record<IconButtonSize, string> = {
	sm: "h-7 w-7 [&_svg]:h-4 [&_svg]:w-4",
	md: "h-8 w-8 [&_svg]:h-5 [&_svg]:w-5",
	lg: "h-10 w-10 [&_svg]:h-6 [&_svg]:w-6",
};

const variantClasses: Record<IconButtonVariant, string> = {
	ghost:
		"text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))] hover:bg-[rgb(var(--color-surface-border)/0.5)] bg-transparent border-transparent",
	outline:
		"border-[rgb(var(--color-surface-border))] text-[rgb(var(--color-fg-secondary))] hover:text-white hover:border-[rgb(var(--color-primary-500))] bg-[rgb(var(--color-surface-card))]",
	solid:
		"bg-[rgb(var(--color-surface-card))] border-[rgb(var(--color-surface-border))] text-[rgb(var(--color-fg-secondary))] hover:text-white",
};

export function IconButton({
	size = "md",
	variant = "ghost",
	className = "",
	disabled = false,
	children,
	type = "button",
	...props
}: IconButtonProps) {
	const baseClasses =
		"cursor-pointer inline-flex items-center justify-center rounded-full transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary-400)/0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

	const classes = [baseClasses, sizeClasses[size], variantClasses[variant], className]
		.filter(Boolean)
		.join(" ");

	return (
		<button type={type} disabled={disabled} className={classes} {...props}>
			{children}
		</button>
	);
}
