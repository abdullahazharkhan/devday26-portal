import React from 'react'

const Register = () => {
    return (
        <div className='bg-[#271C1C] w-full p-8'>
            <h1 className='text-3xl font-semibold'>REGISTER_CREDENTIALS</h1>

            <div className='border-t-2 border-primaryred-muted my-4'></div>

            <form className='flex flex-col gap-6'>

                {/* Email */}
                <div className='flex flex-col gap-2'>
                    <label htmlFor="nuemailregister" className='text-primaryred'>
                        01 NU_Email
                    </label>

                    <input
                        type="email"
                        id="nuemailregister"
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

                {/* Password */}
                <div className='flex flex-col gap-2'>
                    <label htmlFor="nupasswordregister" className='text-primaryred'>
                        02 Password
                    </label>

                    <input
                        type="password"
                        id="nupasswordregister"
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

                {/* Role */}
                <div className='flex flex-col gap-2'>
                    <label htmlFor="role" className='text-primaryred'>
                        03 Role
                    </label>

                    <select
                        id="role"
                        defaultValue=""
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
                    >
                        <option value="" disabled className="text-gray-400">
                            Select your role
                        </option>
                        <option value="excom">Excom</option>
                        <option value="pr">PR team</option>
                        <option value="food">Food team</option>
                        <option value="cs">CS Competitions team</option>
                        <option value="ai">AI Competitions team</option>
                        <option value="gr">GR team</option>
                    </select>
                </div>

                <button
                    type='submit'
                    className="bg-primaryred text-white py-3 px-6 hover:bg-primaryred-muted transition-colors duration-300"
                >
                    REGISTER
                </button>

            </form>
        </div>
    )
}

export default Register