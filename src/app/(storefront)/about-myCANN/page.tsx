import {Metadata} from 'next';
import Container from "@/app/components/container";

export const metadata: Metadata = {
  title: "About myCANN | Cannan ",
  description: "Learn more about a myCANN account",
};
export default function AboutMyCANNPage () {
    return (
        <Container className="py-10">
            <p>
                About myCANN - Coming Soon!
            </p>
        </Container>
    )
}
