This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Python execution

Python lessons run in the browser with Pyodide. The Python runtime loads only when a learner opens a Python activity, is reused for later runs, and includes pandas and matplotlib for the Data Skills lessons. There is no remote Python executor or sandbox service to configure.

Challenge checks evaluate the code's runtime result in Pyodide rather than searching the student's source text. These are intentionally lightweight client-side checks for the current curriculum; no secrets are made available to Python.
