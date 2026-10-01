// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    
    // State variables
    let dbName = '';
    let tableName = '';
    let columns = [];
    let rows = [];
    let currentStep = 1;

    // Get DOM elements
    const dbNameInput = document.getElementById('dbName');
    const tableNameInput = document.getElementById('tableName');
    const numColumnsInput = document.getElementById('numColumns');
    const createColumnsBtn = document.getElementById('createColumnsBtn');
    const columnNamesSection = document.getElementById('columnNamesSection');
    const columnInputsContainer = document.getElementById('columnInputsContainer');
    const confirmColumnsBtn = document.getElementById('confirmColumnsBtn');
    const step3 = document.getElementById('step3');
    const existingRowsSection = document.getElementById('existingRowsSection');
    const existingRowsList = document.getElementById('existingRowsList');
    const rowCount = document.getElementById('rowCount');
    const currentRowInputs = document.getElementById('currentRowInputs');
    const addRowBtn = document.getElementById('addRowBtn');
    const generateSQLBtn = document.getElementById('generateSQLBtn');
    const step4 = document.getElementById('step4');
    const sqlOutput = document.getElementById('sqlOutput');
    const copyBtn = document.getElementById('copyBtn');
    const resetBtn = document.getElementById('resetBtn');

    // Validation function for column names
    function validateColumnName(name) {
        const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return regex.test(name);
    }

    // Check if current row has any values
    function hasCurrentRowValues() {
        const inputs = currentRowInputs.querySelectorAll('input');
        for (let input of inputs) {
            if (input.value.trim() !== '') {
                return true;
            }
        }
        return false;
    }

    // Update Generate SQL button state
    function updateGenerateSQLButton() {
        // Enable if there are saved rows OR if current row has values
        generateSQLBtn.disabled = !(rows.length > 0 || hasCurrentRowValues());
    }

    // Enable/disable Create button
    function updateCreateButton() {
        createColumnsBtn.disabled = !(dbNameInput.value && tableNameInput.value && numColumnsInput.value);
    }

    // Event listeners for Step 1
    dbNameInput.addEventListener('input', function() {
        dbName = this.value;
        updateCreateButton();
    });

    tableNameInput.addEventListener('input', function() {
        tableName = this.value;
        updateCreateButton();
    });

    numColumnsInput.addEventListener('input', function() {
        updateCreateButton();
    });

    // Create Columns button
    createColumnsBtn.addEventListener('click', function() {
        const numColumns = parseInt(numColumnsInput.value);
        
        if (numColumns < 1) {
            document.getElementById('numColumnsError').textContent = 'Must be at least 1';
            return;
        }

        document.getElementById('numColumnsError').textContent = '';
        
        // Disable inputs
        dbNameInput.disabled = true;
        tableNameInput.disabled = true;
        numColumnsInput.disabled = true;
        createColumnsBtn.disabled = true;

        // Create column input fields
        columnInputsContainer.innerHTML = '';
        for (let i = 0; i < numColumns; i++) {
            const div = document.createElement('div');
            div.innerHTML = `
                <input type="text" 
                       class="column-input" 
                       data-index="${i}" 
                       placeholder="Column ${i + 1}">
                <div class="error-message" id="colError${i}"></div>
            `;
            columnInputsContainer.appendChild(div);
        }

        columnNamesSection.style.display = 'block';
        currentStep = 2;
    });

    // Confirm Columns button
    confirmColumnsBtn.addEventListener('click', function() {
        const columnInputs = document.querySelectorAll('.column-input');
        const newColumns = [];
        let hasErrors = false;

        columnInputs.forEach((input, index) => {
            const value = input.value.trim();
            const errorDiv = document.getElementById(`colError${index}`);
            
            if (!value) {
                errorDiv.textContent = 'Required';
                input.classList.add('input-error');
                hasErrors = true;
            } else if (!validateColumnName(value)) {
                errorDiv.textContent = 'Invalid format';
                input.classList.add('input-error');
                hasErrors = true;
            } else {
                errorDiv.textContent = '';
                input.classList.remove('input-error');
                newColumns.push(value);
            }
        });

        if (hasErrors) {
            return;
        }

        // Save columns and reset rows
        columns = newColumns;
        rows = [];

        // Hide column names section
        columnNamesSection.style.display = 'none';

        // Show Step 3
        createCurrentRowInputs();
        step3.style.display = 'block';
        currentStep = 3;

        // Update generate button state
        updateGenerateSQLButton();
    });

    // Create input fields for current row
    function createCurrentRowInputs() {
        currentRowInputs.innerHTML = '';
        
        columns.forEach(col => {
            const div = document.createElement('div');
            div.innerHTML = `
                <label>${col}</label>
                <input type="text" 
                       class="current-row-input" 
                       data-column="${col}" 
                       placeholder="Value for ${col}">
            `;
            currentRowInputs.appendChild(div);
        });

        // Add event listeners to update Generate SQL button
        const inputs = currentRowInputs.querySelectorAll('.current-row-input');
        inputs.forEach(input => {
            input.addEventListener('input', updateGenerateSQLButton);
        });
    }

    // Add Row button
    addRowBtn.addEventListener('click', function() {
        const inputs = currentRowInputs.querySelectorAll('.current-row-input');
        const newRow = {};
        let hasValue = false;

        inputs.forEach(input => {
            const col = input.getAttribute('data-column');
            const value = input.value.trim();
            newRow[col] = value;
            if (value) {
                hasValue = true;
            }
        });

        if (!hasValue) {
            document.getElementById('rowError').textContent = 'At least one value required';
            return;
        }

        document.getElementById('rowError').textContent = '';

        // Add row to rows array
        rows.push(newRow);

        // Clear inputs
        inputs.forEach(input => {
            input.value = '';
        });

        // Update UI
        updateRowsList();
        updateGenerateSQLButton();
    });

    // Update rows list display
    function updateRowsList() {
        if (rows.length > 0) {
            existingRowsSection.style.display = 'block';
            rowCount.textContent = rows.length;
            
            existingRowsList.innerHTML = '';
            rows.forEach((row, index) => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'row-item';
                
                const values = columns.map(col => row[col] || '(empty)').join(' | ');
                
                rowDiv.innerHTML = `
                    <span class="row-content">${values}</span>
                    <button class="btn-remove" data-index="${index}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `;
                
                existingRowsList.appendChild(rowDiv);
            });

            // Add event listeners to remove buttons
            const removeButtons = existingRowsList.querySelectorAll('.btn-remove');
            removeButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    rows.splice(index, 1);
                    updateRowsList();
                    updateGenerateSQLButton();
                });
            });
        } else {
            existingRowsSection.style.display = 'none';
        }
    }

    // Generate SQL button
    generateSQLBtn.addEventListener('click', function() {
        // Get current row values if any
        const inputs = currentRowInputs.querySelectorAll('.current-row-input');
        const currentRow = {};
        let hasCurrentValue = false;

        inputs.forEach(input => {
            const col = input.getAttribute('data-column');
            const value = input.value.trim();
            currentRow[col] = value;
            if (value) {
                hasCurrentValue = true;
            }
        });

        // If current row has values and hasn't been added yet, add it
        if (hasCurrentValue) {
            rows.push(currentRow);
        }

        // Generate SQL
        let sql = '';
        
        // CREATE DATABASE
        sql += `CREATE DATABASE IF NOT EXISTS ${dbName};\n\n`;
        
        // USE DATABASE
        sql += `USE ${dbName};\n\n`;
        
        // CREATE TABLE
        sql += `CREATE TABLE ${tableName} (\n`;
        columns.forEach((col, index) => {
            sql += `    ${col} VARCHAR(255)`;
            if (index < columns.length - 1) {
                sql += ',';
            }
            sql += '\n';
        });
        sql += ');\n\n';
        
        // INSERT ROWS
        rows.forEach(row => {
            sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (`;
            const values = columns.map(col => `'${row[col] || ''}'`).join(', ');
            sql += `${values});\n`;
        });

        // Display SQL
        sqlOutput.textContent = sql;
        step3.style.display = 'none';
        step4.style.display = 'block';
        currentStep = 4;
    });

    // Copy button
    copyBtn.addEventListener('click', function() {
        const sql = sqlOutput.textContent;
        navigator.clipboard.writeText(sql).then(() => {
            const btnText = document.getElementById('copyBtnText');
            const originalText = btnText.textContent;
            btnText.textContent = 'Copied!';
            
            setTimeout(() => {
                btnText.textContent = originalText;
            }, 2000);
        });
    });

    // Reset button
    resetBtn.addEventListener('click', function() {
        // Reset all state
        dbName = '';
        tableName = '';
        columns = [];
        rows = [];
        currentStep = 1;

        // Reset inputs
        dbNameInput.value = '';
        tableNameInput.value = '';
        numColumnsInput.value = '';
        dbNameInput.disabled = false;
        tableNameInput.disabled = false;
        numColumnsInput.disabled = false;
        
        // Hide sections
        columnNamesSection.style.display = 'none';
        step3.style.display = 'none';
        step4.style.display = 'none';
        existingRowsSection.style.display = 'none';

        // Clear errors
        document.getElementById('numColumnsError').textContent = '';
        document.getElementById('rowError').textContent = '';

        // Update buttons
        updateCreateButton();
    });
});