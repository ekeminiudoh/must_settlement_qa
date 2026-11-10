# Assumptions requiring product-owner confirmation

## TC09 — Admin settlement configuration changes

This assessment assumes the effective configuration is the latest config row with the newest `effective_from` timestamp. That rule is intentionally documented as an assumption rather than a claimed policy. Product owners should confirm whether configuration changes are applied immediately, at the next scheduled run, or only for future windows.

## TC10 — Account changes during settlement

This assessment assumes account ownership is evaluated at the start of the settlement run and remains stable for the duration of that run. Product owners should confirm whether account changes during a run should be re-evaluated, blocked, or ignored for the active settlement cycle.
