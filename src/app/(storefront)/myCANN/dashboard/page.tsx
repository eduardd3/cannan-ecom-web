import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/app/components/container";

export const metadata: Metadata = {
    title: "Dashboard | Cannan",
    robots: { index: false },
};

export default function Dashboard() {
    return (
        <Container className="flex flex-col gap-4 py-10">
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p>
                <Link href="/orders" className="underline underline-offset-2">
                    View your orders
                </Link>
            </p>
        </Container>
    );
}
