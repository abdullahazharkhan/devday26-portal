import React from 'react'

const Login = () => {
    return (
        <div className='bg-[#271C1C] w-full p-8'>
            <h1 className='text-3xl font-semibold'>LOGIN_CREDENTIALS</h1>

            <div className='border-t-2 border-primaryred-muted my-4'></div>

            <form className='flex flex-col gap-6'>

                <div className='flex flex-col gap-2'>
                    <label
                        htmlFor="nuemaillogin"
                        className='text-primaryred'
                    >
                        01 NU_Email
                    </label>

                    <input
                        type="email"
                        id="nuemaillogin"
                        placeholder="kXXXXXX@nu.edu.pk"
                        className="
                            bg-[#191111]
                            border border-primaryred-muted
                            p-3
                            text-white
                            transition-all duration-200
                            focus:outline-none
                            focus:border-primaryred
                            focus:ring-2
                            focus:ring-primaryred
                        "
                    />
                </div>

                <div className='flex flex-col gap-2'>
                    <label
                        htmlFor="nupasswordlogin"
                        className='text-primaryred'
                    >
                        02 Password
                    </label>

                    <input
                        type="password"
                        id="nupasswordlogin"
                        placeholder="********"
                        className="
                            bg-[#191111]
                            border border-primaryred-muted
                            p-3
                            text-white
                            transition-all duration-200
                            focus:outline-none
                            focus:border-primaryred
                            focus:ring-2
                            focus:ring-primaryred
                        "
                    />
                </div>

                <button type='submit' className="bg-primaryred text-white py-3 px-6 hover:bg-primaryred-muted transition-colors duration-300">
                    LOGIN
                </button>

            </form>
        </div>
    )
}

export default Login