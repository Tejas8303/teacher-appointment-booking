import React from 'react'
import './spinner.css'
function Spinner() {
    return (
        <div className="flex h-screen  justify-center items-center dark:bg-[#0B0C14]">

            <span className="loader dark:border-white"></span>

        </div>

    )
}

export default Spinner