import AdminLoginForm from "./login-form"
import { Suspense } from 'react';

export default function LoginPage () { 
    return (
        <Suspense>
            <AdminLoginForm/>
        </Suspense>
    );
}