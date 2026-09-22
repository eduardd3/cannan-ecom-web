import Link from 'next/link';

export default function FormHeader() { 
    return (
        <div className="flex w-full items-center justify-between">
            <div className="border-white border-0 ml-2 mt-2">
                <Link href='/'>
                    <img className="h-18" 
                    src="/images/cannan-diamond-white.svg" 
                    alt="Cannan white icon" />
                </Link>
            </div>
            <div className="flex self-center mr-6">
                <Link href='/'>
                    <img
                    className="h-10"
                    src="/images/arrow-left.svg"
                    alt="return left arrow icon"
                    />
                </Link>
            </div>
        </div>
    );
}