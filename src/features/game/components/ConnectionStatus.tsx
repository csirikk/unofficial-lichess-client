export type ConnectionStatusProps = {
	isConnected: boolean;
	isConnecting: boolean;
	isReconnecting: boolean;
	isOffline: boolean;
	streamNotFound: boolean;
	className?: string;
};

export function ConnectionStatus({
	isConnected,
	isConnecting,
	isReconnecting,
	isOffline,
	streamNotFound,
	className = "",
}: ConnectionStatusProps) {
	if (isConnected) {
		return (
			<span className={`text-[rgb(var(--color-success))] ${className}`} title="Connected">
				Connected
			</span>
		);
	}

	if (isReconnecting) {
		return (
			<span className={`text-[rgb(var(--color-warning))] ${className}`} title="Reconnecting">
				Reconnecting...
			</span>
		);
	}

	if (isOffline) {
		return (
			<span className={`text-[rgb(var(--color-error))] ${className}`} title="Connection lost">
				{streamNotFound ? "Game Not Found" : "Offline"}
			</span>
		);
	}

	if (isConnecting) {
		return (
			<span className={`text-[rgb(var(--color-warning))] ${className}`} title="Connecting">
				Connecting...
			</span>
		);
	}

	return (
		<span className={`text-[rgb(var(--color-error))] ${className}`} title="Unknown">
			Unknown
		</span>
	);
}
