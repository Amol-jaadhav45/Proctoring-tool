/**
 * Simple CSV parser that handles comma-separated values.
 * Supports basic quoting of fields.
 */
export const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    return lines
        .filter(line => line.trim() !== '')
        .map(line => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
};

/**
 * Validates and converts parsed CSV data into Question objects.
 */
export const validateQuestionsCSV = (data: string[][]) => {
    // Expect header: question, option1, option2, option3, option4, correctAnswer
    if (data.length < 2) return { error: 'CSV must have at least one question and a header.' };

    const questions: any[] = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < 6) {
            return { error: `Row ${i + 1} is missing columns. Expected 6 columns.` };
        }

        const correctAnswer = parseInt(row[5]);
        if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
            return { error: `Row ${i + 1} has an invalid correctAnswer index. Must be 0, 1, 2, or 3.` };
        }

        questions.push({
            question: row[0],
            options: [row[1], row[2], row[3], row[4]],
            correctAnswer
        });
    }

    return { questions };
};

/**
 * Validates and converts parsed CSV data into Student objects.
 */
export const validateStudentsCSV = (data: string[][]) => {
    // Expect header: name, email, studentId
    if (data.length < 2) return { error: 'CSV must have at least one student and a header.' };

    const students: any[] = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < 3) {
            return { error: `Row ${i + 1} is missing columns. Expected name, email, and studentId.` };
        }

        students.push({
            name: row[0],
            email: row[1],
            studentId: row[2]
        });
    }

    return { students };
};
