@echo off
setlocal

:: Optional: Hardcode tokens here if you prefer not to use Windows Environment Variables
:: set CF_ACCOUNT_ID=your_account_id
:: set CF_API_TOKEN=your_api_token

python "%~dp0..\r2.py" %*

endlocal
