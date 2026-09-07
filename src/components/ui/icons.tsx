import type { SVGProps } from "react";

/**
 * One drawn icon system: 24px grid, 1.6 stroke, round caps and joins.
 *
 * Rank glyphs (★★★, ▲▲, ◉, ⚑) are deliberately NOT in here. Those are the
 * game's real notation — the marks printed on the physical pieces — so they
 * stay as text and inherit the type scale. Everything an interface needs to
 * say is drawn.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			{children}
		</svg>
	);
}

export function IconChat(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5Z" />
		</Icon>
	);
}

export function IconLog(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 6h3M4 12h3M4 18h3" />
			<path d="M11 6h9M11 12h9M11 18h9" />
		</Icon>
	);
}

export function IconMenu(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 7h16M4 12h16M4 17h16" />
		</Icon>
	);
}

export function IconResign(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M6 21V4" />
			<path d="M6 4h11l-2 3.5L17 11H6" />
		</Icon>
	);
}

export function IconDraw(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M3 12h4l2.5-2.5L13 13l3-3 5 2" />
			<path d="M3 17h4l2.5 2 3.5-2.5" />
		</Icon>
	);
}

export function IconInfo(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M12 11v5.5" />
			<path d="M12 7.8h.01" />
		</Icon>
	);
}

export function IconClose(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M6 6l12 12M18 6L6 18" />
		</Icon>
	);
}

export function IconChevronDown(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M6 9.5l6 6 6-6" />
		</Icon>
	);
}

export function IconChevronRight(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M9.5 6l6 6-6 6" />
		</Icon>
	);
}

export function IconArrowLeft(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M19 12H5" />
			<path d="M11 6l-6 6 6 6" />
		</Icon>
	);
}

export function IconCopy(props: IconProps) {
	return (
		<Icon {...props}>
			<rect x="9" y="9" width="11" height="11" rx="2" />
			<path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
		</Icon>
	);
}

export function IconShare(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M12 15V4" />
			<path d="M8 8l4-4 4 4" />
			<path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
		</Icon>
	);
}

export function IconCheck(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5 12.5l4.5 4.5L19 7.5" />
		</Icon>
	);
}

export function IconShuffle(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 7h3.5l9 10H20" />
			<path d="M4 17h3.5l3-3.4" />
			<path d="M13.5 10.4L16.5 7H20" />
			<path d="M17.5 4.5L20 7l-2.5 2.5" />
			<path d="M17.5 14.5L20 17l-2.5 2.5" />
		</Icon>
	);
}

export function IconClear(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 7h16" />
			<path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
			<path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
		</Icon>
	);
}

export function IconUndo(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H8" />
			<path d="M7.5 5L3.5 9l4 4" />
		</Icon>
	);
}

export function IconPlay(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M7 4.8v14.4L19 12Z" />
		</Icon>
	);
}

export function IconUsers(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="9" cy="8" r="3.5" />
			<path d="M3 20a6 6 0 0 1 12 0" />
			<path d="M16 5.2a3.5 3.5 0 0 1 0 5.6" />
			<path d="M17.5 14.6A6 6 0 0 1 21 20" />
		</Icon>
	);
}

export function IconClock(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M12 7.5V12l3 2" />
		</Icon>
	);
}

export function IconEye(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
			<circle cx="12" cy="12" r="2.8" />
		</Icon>
	);
}

export function IconSound(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5 9.5v5h3l4 3.5v-12L8 9.5Z" />
			<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
			<path d="M18 7a7 7 0 0 1 0 10" />
		</Icon>
	);
}

export function IconSoundOff(props: IconProps) {
	return (
		<Icon {...props}>
			<path d="M5 9.5v5h3l4 3.5v-12L8 9.5Z" />
			<path d="M16 10l4 4M20 10l-4 4" />
		</Icon>
	);
}

export function IconHelp(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M9.6 9.4a2.5 2.5 0 0 1 4.85.83c0 1.67-2.45 2.5-2.45 2.5" />
			<path d="M12 16.4h.01" />
		</Icon>
	);
}

export function IconTarget(props: IconProps) {
	return (
		<Icon {...props}>
			<circle cx="12" cy="12" r="8.5" />
			<circle cx="12" cy="12" r="3.5" />
		</Icon>
	);
}

export function IconSpinner({ size = 18, ...props }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			<circle cx="12" cy="12" r="8.5" opacity="0.22" />
			<path d="M20.5 12A8.5 8.5 0 0 0 12 3.5">
				<animateTransform
					attributeName="transform"
					type="rotate"
					from="0 12 12"
					to="360 12 12"
					dur="0.9s"
					repeatCount="indefinite"
				/>
			</path>
		</svg>
	);
}
