// Алгоритм Луна для проверки банковских карт
export const luhnCheck = (cardNumber: string): boolean => {
    const clean = cardNumber.replace(/\D/g, '');
    if (!clean || clean.length < 13) return false;
    
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i));
        
        if (shouldDouble) {
            if ((digit *= 2) > 9) digit -= 9;
        }
        
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
};

// Проверка ИИН/БИН Казахстана (упрощенная проверка структуры и даты)
// Полная проверка контрольной суммы сложная, начнем с валидации даты
export const validateKzIin = (iin: string): boolean => {
    const clean = iin.replace(/\D/g, '');
    if (clean.length !== 12) return false;
    
    // Первые 6 цифр - дата YYMMDD
    const yy = parseInt(clean.substring(0, 2));
    const mm = parseInt(clean.substring(2, 4));
    const dd = parseInt(clean.substring(4, 6));
    
    if (mm < 1 || mm > 12) return false;
    if (dd < 1 || dd > 31) return false;
    
    // 7-я цифра - век (должна быть 1-6)
    const century = parseInt(clean.charAt(6));
    if (century < 1 || century > 6) return false;
    
    return true;
};

// Проверка ИНН РФ (10 или 12 цифр)
export const validateRuInn = (inn: string): boolean => {
    const clean = inn.replace(/\D/g, '');
    if (![10, 12].includes(clean.length)) return false;
    
    const checkDigit = (innStr: string, coefficients: number[]): number => {
        let n = 0;
        for (let i = 0; i < coefficients.length; i++) {
            n += coefficients[i] * parseInt(innStr.charAt(i));
        }
        return (n % 11) % 10;
    };

    if (clean.length === 10) {
        const n10 = checkDigit(clean, [2, 4, 10, 3, 5, 9, 4, 6, 8]);
        return n10 === parseInt(clean.charAt(9));
    } else { // 12 digits
        const n11 = checkDigit(clean, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
        const n12 = checkDigit(clean, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
        return n11 === parseInt(clean.charAt(10)) && n12 === parseInt(clean.charAt(11));
    }
};
