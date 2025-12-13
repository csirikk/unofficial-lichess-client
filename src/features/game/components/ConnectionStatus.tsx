/**
 * ConnectionStatus.tsx
 *
 * Small status indicator for network connection state in the game view.
 */

import type { NetworkModel } from "../model/types";

export function ConnectionStatus({
	network,
	className = "",
}: {
	network: NetworkModel;
	className?: string;
}) {
	if (network.isConnected)
		return <span className={`text-[rgb(var(--color-success))] ${className}`}>Connected</span>;
	if (network.isReconnecting)
		return <span className={`text-[rgb(var(--color-warning))] ${className}`}>Reconnecting...</span>;
	if (network.isOffline)
		return (
			<span className={`text-[rgb(var(--color-error))] ${className}`}>
				{network.isStreamNotFound ? "Game Not Found" : "Offline"}
			</span>
		);
	if (network.isConnecting)
		return <span className={`text-[rgb(var(--color-warning))] ${className}`}>Connecting...</span>;
	return <span className={`text-[rgb(var(--color-error))] ${className}`}>Unknown</span>;
}
