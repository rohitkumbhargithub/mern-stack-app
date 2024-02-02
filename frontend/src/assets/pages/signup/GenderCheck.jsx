import React from 'react'

const GenderCheck = () => {
  return (
    <div className='flex m-2'>
        <div className='form-control'>
            <label className={`label gap-2 cursor-pointer`}>
                <span className='label-text'>Male</span>
                <input type="checkbox" className='border-slate-900'/>
            </label>
        </div>
        <div className='form-control'>
            <label className={`label gap-2 cursor-pointer`}>
                <span className='label-text'>Female</span>
                <input type="checkbox" className='border-slate-900'/>
            </label>
        </div>
    </div>
  )
}

export default GenderCheck;