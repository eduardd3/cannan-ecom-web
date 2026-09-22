import {Metadata} from 'next';
import Container from "@/app/components/container";

export const metadata: Metadata = {
  title: "About MyCANN | Cannan ",
  description: "Learn more about a MyCANN account",
};
export default function AboutMyCANNPage () {
    return (
        <Container className="py-10">
            <p>
                About MyCANN - Coming Soon!
            </p>
        </Container>
    )
}
