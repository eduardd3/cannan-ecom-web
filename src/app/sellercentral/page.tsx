import style from "../login.module.css";

export default function Login() {  //  admin login
    return ( 
        <div className={style.mainContainer}> 
            <div className={style.formContainer}>
                <form id='adminLogin'>
                    <label> Enter mobile numer or email </label>
                    <input type='text' /> 
                </form>
            </div>
        </div>
        
    );
}