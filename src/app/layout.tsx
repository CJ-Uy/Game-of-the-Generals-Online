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

export const metadata: Metadata = {
	title: "Game of the Generals Online",
	description: "Play Salpakan, the Filipino strategy classic, online.",
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
