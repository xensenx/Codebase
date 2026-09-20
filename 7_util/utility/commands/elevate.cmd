@echo off
powershell -NoProfile -Command "Start-Process wt.exe -Verb RunAs -ArgumentList '-d ""%CD%""'"