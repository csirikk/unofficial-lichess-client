import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "outline"
	| "danger"
	| "dangerr"
	| "text"
	| "uppercase";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-[rgb(var(--color-primary-500))] text-white hover:bg-[rgb(var(--color-primary-600))] border-transparent",
	secondary:
		"bg-[rgb(var(--color-secondary-500))] text-[rgb(var(--color-fg-on-primary))] hover:bg-[rgb(var(--color-secondary-600))] border-transparent",
	outline:
		"border-[rgb(var(--color-primary-500))] text-[rgb(var(--color-primary-400))] hover:bg-[rgb(var(--color-primary-500)/0.1)] bg-[rgb(var(--color-primary-600)/0.2)]",
	ghost:
		"text-[rgb(var(--color-fg-secondary))] hover:bg-[rgb(var(--color-surface-border)/0.5)] hover:text-[rgb(var(--color-fg-primary))] border-transparent",
	danger:
		"bg-[rgb(var(--color-error)/0.1)] text-[rgb(var(--color-error))] hover:bg-[rgb(var(--color-error)/0.2)] border-transparent",
	dangerr: // danger but solid
		"bg-[rgb(var(--color-error))] text-white hover:bg-[rgb(var(--color-error)/0.9)] border-transparent",
	text: "text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))] border-transparent bg-transparent",
	uppercase:
		"border-none uppercase tracking-[0.2em] text-xs text-[rgb(var(--color-fg-secondary))] hover:text-[rgb(var(--color-fg-primary))]",
};

const sizeClasses: Record<ButtonSize, string> = {
	sm: "px-3 py-1.5 text-sm",
	md: "px-4 py-2 text-sm",
	lg: "px-6 py-3 text-base",
};

export function Button({
	variant = "primary",
	size = "md",
	fullWidth = false,
	className = "",
	disabled = false,
	children,
	type = "button",
	...props
}: ButtonProps) {
	const baseClasses =
		"cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary-400)/0.7)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

	const classes = [
		baseClasses,
		variantClasses[variant],
		sizeClasses[size],
		fullWidth ? "w-full" : "",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<button type={type} disabled={disabled} className={classes} {...props}>
			{children}
		</button>
	);
}
