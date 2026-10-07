import { useRef } from 'react';

const OtpInput = ({ value = '', onChange, onComplete, disabled, autoFocus = true, maxLength = 6 }) => {
    const inputRefs = useRef([]);

    const handleChange = (e, index) => {
        if (disabled) return;
        const newOtp = value.split('');
        const digit = e.target.value.replace(/\D/g, '').slice(-1);
        newOtp[index] = digit;
        const updatedOtp = newOtp.join('');
        onChange(updatedOtp);

        if (digit && index < maxLength - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (updatedOtp.length === maxLength && updatedOtp.every((d) => d)) {
            onComplete?.(updatedOtp);
        }
    };

    const handleKeyDown = (e, index) => {
        if (disabled) return;
        if (e.key === 'Backspace') {
            e.preventDefault();
            const newOtp = value.split('');
            if (newOtp[index]) {
                newOtp[index] = '';
            } else if (index > 0) {
                newOtp[index - 1] = '';
                inputRefs.current[index - 1]?.focus();
            }
            onChange(newOtp.join(''));
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < maxLength - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        if (disabled) return;
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, maxLength);
        if (!pasted) return;
        onChange(pasted);
        if (pasted.length === maxLength) {
            onComplete?.(pasted);
            inputRefs.current[maxLength - 1]?.focus();
        } else {
            inputRefs.current[pasted.length]?.focus();
        }
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center">
            {Array.from({ length: maxLength }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="one-time-code"
                    value={value[i] || ''}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    autoFocus={autoFocus && i === 0}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl sm:text-3xl font-bold bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all disabled:opacity-50"
                />
            ))}
        </div>
    );
};

export default OtpInput;