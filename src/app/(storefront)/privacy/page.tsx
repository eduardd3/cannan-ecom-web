import { Metadata } from "next";
import Container from "@/app/components/container";

export const metadata: Metadata = {
  title: "Privacy | CANNAN",
  description: "",
};
export default function Privacy () {
    return (
        <Container className="py-10">
            <h3>
                Privacy Page
            </h3>
        </Container>
    );
}
