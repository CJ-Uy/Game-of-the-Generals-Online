import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Mono, Karla, Teko } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const teko = Teko({
	variable: "--font-display",
	subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
	variable: "--font-ui-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

const karla = Karla({
	variable: "--font-body",
	subsets: ["latin"],
});

const DESCRIPTION =
	"Play Salpakan, the Filipino strategy classic, free in your browser. Twenty-one hidden pieces each, one flag, no account needed.";

export const metadata: Metadata = {
	metadataBase: new URL("https://gogo.cjuy.dev"),
	title: {
		default: "Game of the Generals Online",
		template: "%s · Game of the Generals Online",
	},
	description: DESCRIPTION,
	applicationName: "Game of the Generals Online",
	openGraph: {
		type: "website",
		siteName: "Game of the Generals Online",
		title: "Game of the Generals Online",
		description: DESCRIPTION,
	},
	twitter: { card: "summary_large_image", title: "Game of the Generals Online", description: DESCRIPTION },
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${teko.variable} ${plexMono.variable} ${karla.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
