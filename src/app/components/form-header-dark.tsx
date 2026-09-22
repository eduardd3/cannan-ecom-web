import Link from 'next/link';

export default function FormHeaderDark() { 
    return (
        <div className="flex w-full">
            <div className="border-[#F2F3F4] border-0 ml-2 mt-2">
                <Link href='/'>
                <img className="h-18"
                src="/images/cannan-diamond-ink.svg"
                alt="Cannan dark icon"/>
                </Link>
            </div>
        </div>
    )
}