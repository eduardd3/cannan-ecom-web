import { Metadata } from "next";
import Container from "@/app/components/container";

export const metadata: Metadata = {
  title: "Products | CANNAN",
  description: "California LLC · Est. 2022",
};

export default function Products () {
    return (
    <Container className="py-10">
        <div className="flex gap-20">
            <div className="border-x-1 border-y-1 p-2"> Categories </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

            </div>
        </div>
    </Container>
    );
}
