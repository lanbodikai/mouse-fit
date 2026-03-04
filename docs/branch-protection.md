# Branch Protection Baseline

Apply these rules on the default branch:

1. Require pull request before merge.
2. Require status checks to pass:
   - `backend`
   - `frontend`
   - `docker-smoke`
3. Require up-to-date branch before merge.
4. Restrict force pushes.
5. Restrict branch deletion.
