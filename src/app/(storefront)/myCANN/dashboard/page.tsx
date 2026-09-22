import type { Metadata } from "next";
import Container from "@/app/components/container";

export const metadata: Metadata = {
    title: "Dashboard | Cannan",
    robots: { index: false },
};

export default function Dashboard() {
    return (
        <Container className="py-10">
            <p> Customer Dashboard - Coming Soon! </p>
        </Container>
    );
}
