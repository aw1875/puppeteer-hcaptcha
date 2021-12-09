---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: aw1875

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Code block(s) with your code.

Example:

```javascript
const { hcaptchaToken } = require('puppeteer-hcaptcha');

(async () => {
    let token = await hcaptchaToken(<URL>);
    console.log(token);
})();
```
2. Description of your files hierarchy (either a photo or markdown).

Example:

```
exampleproject
│
└───node_modules
└───folder
│   │   file.txt
│   │   file2.txt
│   solve.js
```

3. Any other steps needed to reproduce issue.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Errors Received**
If no screenshots available then please send the error received.

**Additional context**
Add any other context about the problem here.
