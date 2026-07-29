const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const renames = [
  ["server/src/controllers/subjectController.js", "server/src/controllers/courseController.js"],
  ["server/src/controllers/termController.js", "server/src/controllers/semesterController.js"],
  ["server/src/routes/subjectRoutes.js", "server/src/routes/courseRoutes.js"],
  ["server/src/routes/termRoutes.js", "server/src/routes/semesterRoutes.js"],
  ["client/assets/js/pages/subjects.js", "client/assets/js/pages/courses.js"],
  ["client/assets/js/pages/terms.js", "client/assets/js/pages/semesters.js"],
  ["client/manager/subjects.html", "client/manager/courses.html"],
  ["client/manager/terms.html", "client/manager/semesters.html"],
];

for (const [sourceName, targetName] of renames) {
  const source = path.join(root, sourceName);
  const target = path.join(root, targetName);
  if (fs.existsSync(source)) {
    if (fs.existsSync(target)) {
      throw new Error(`Cannot rename ${sourceName}; ${targetName} already exists.`);
    }
    fs.renameSync(source, target);
  }
}

const allowedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".py",
  ".sql",
  ".toml",
  ".yaml",
  ".yml",
]);

function collectFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "__pycache__"].includes(entry.name)) {
      continue;
    }
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (
      allowedExtensions.has(path.extname(entry.name))
      && entry.name !== path.basename(__filename)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

const replacements = [
  [/small private tutoring centre/gi, "university tutorial centre"],
  [/private tutoring centre/gi, "university tutorial centre"],
  [/tutoring centre/gi, "university tutorial centre"],
  [/Centre Manager/g, "Tutorial Centre Manager"],
  [/centre manager/g, "tutorial centre manager"],
  [/guardian_phone/g, "emergency_contact_phone"],
  [/guardianPhone/g, "emergencyContactPhone"],
  [/Guardian phone/g, "Emergency contact phone"],
  [/Guardian/g, "Emergency contact"],
  [/academic_terms/g, "semesters"],
  [/academic_term_id/g, "semester_id"],
  [/Academic_Term/g, "Semester"],
  [/ACADEMIC_TERM/g, "SEMESTER"],
  [/Academic Terms/g, "Semesters"],
  [/Academic terms/g, "Semesters"],
  [/academic terms/g, "semesters"],
  [/Academic Term/g, "Semester"],
  [/Academic term/g, "Semester"],
  [/academic term/g, "semester"],
  [/term_name/g, "semester_name"],
  [/termName/g, "semesterName"],
  [/termId/g, "semesterId"],
  [/currentTerm/g, "currentSemester"],
  [/activeSubjects/g, "activeCourses"],
  [/assignedSubjects/g, "assignedCourses"],
  [/subjectIds/g, "courseIds"],
  [/subjectId/g, "courseId"],
  [/subject_code/g, "course_code"],
  [/subject_name/g, "course_name"],
  [/subjectCode/g, "courseCode"],
  [/subjectName/g, "courseName"],
  [/\bSubjects\b/g, "Courses"],
  [/\bsubjects\b/g, "courses"],
  [/\bSubject\b/g, "Course"],
  [/\bsubject\b/g, "course"],
  [/\bTerms\b/g, "Semesters"],
  [/\bterms\b/g, "semesters"],
  [/\bTerm\b/g, "Semester"],
  [/\bterm\b/g, "semester"],
  [/First Semester Semester/g, "First Semester"],
  [/Second Semester Semester/g, "Second Semester"],
  [/long-semester/g, "long-term"],
  [/short-semester/g, "short-term"],
  [/\blearners\b/gi, "students"],
];

for (const file of collectFiles(root)) {
  let content = fs.readFileSync(file, "utf8");
  let updated = content;
  for (const [pattern, replacement] of replacements) {
    updated = updated.replace(pattern, replacement);
  }
  if (updated !== content) {
    fs.writeFileSync(file, updated);
  }
}

function replaceRequired(relativePath, before, after) {
  const file = path.join(root, relativePath);
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes(before)) {
    throw new Error(`Expected text was not found in ${relativePath}: ${before}`);
  }
  fs.writeFileSync(file, content.replace(before, after));
}

for (const schemaPath of [
  "database/schema.sql",
  "database/migrations/202607290001_initial_schema.sql",
]) {
  replaceRequired(
    schemaPath,
    `  email varchar(255),
  emergency_contact_phone varchar(30) not null,`,
    `  email varchar(255),
  faculty varchar(120) not null,
  department varchar(120),
  emergency_contact_phone varchar(30) not null,`,
  );
}

replaceRequired(
  "server/src/controllers/studentController.js",
  `    email: optionalText(body.email),
    emergency_contact_phone: requiredText(body.emergencyContactPhone, "Emergency contact phone"),`,
  `    email: optionalText(body.email),
    faculty: requiredText(body.faculty, "Faculty"),
    department: optionalText(body.department),
    emergency_contact_phone: requiredText(body.emergencyContactPhone, "Emergency contact phone"),`,
);

replaceRequired(
  "server/src/controllers/studentController.js",
  "`registration_number.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%`",
  "`registration_number.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,faculty.ilike.%${safeSearch}%,department.ilike.%${safeSearch}%`",
);

replaceRequired(
  "client/registration/students.html",
  `                  <div class="field">
                    <label for="emergencyContactPhone">Emergency contact phone</label>
                    <input id="emergencyContactPhone" name="emergencyContactPhone" inputmode="tel" required>
                  </div>`,
  `                  <div class="field">
                    <label for="faculty">Faculty</label>
                    <input id="faculty" name="faculty" placeholder="School of Information and Communication Technology" required>
                  </div>
                  <div class="field">
                    <label for="department">Department</label>
                    <input id="department" name="department" placeholder="Software Engineering">
                  </div>
                  <div class="field">
                    <label for="emergencyContactPhone">Emergency contact phone</label>
                    <input id="emergencyContactPhone" name="emergencyContactPhone" inputmode="tel" required>
                  </div>`,
);

replaceRequired(
  "client/registration/students.html",
  `<input id="registrationNumber" name="registrationNumber" placeholder="SS-2026-001" required>`,
  `<input id="registrationNumber" name="registrationNumber" placeholder="FUTO/2026/001" required>`,
);

replaceRequired(
  "client/registration/students.html",
  `<tr><th>Reg. number</th><th>Name</th><th>Phone</th><th>Emergency contact</th><th>Status</th><th></th></tr>`,
  `<tr><th>Reg. number</th><th>Name</th><th>Faculty</th><th>Department</th><th>Phone</th><th>Status</th><th></th></tr>`,
);

replaceRequired(
  "client/registration/students.html",
  `<tr><td class="empty-state" colspan="6">Loading students...</td></tr>`,
  `<tr><td class="empty-state" colspan="7">Loading students...</td></tr>`,
);

replaceRequired(
  "client/assets/js/pages/students.js",
  `  form.email.value = student.email || "";
  form.emergencyContactPhone.value = student.emergency_contact_phone;`,
  `  form.email.value = student.email || "";
  form.faculty.value = student.faculty;
  form.department.value = student.department || "";
  form.emergencyContactPhone.value = student.emergency_contact_phone;`,
);

replaceRequired(
  "client/assets/js/pages/students.js",
  `        <td>${escapeHtml(student.phone)}</td>
        <td>${escapeHtml(student.emergency_contact_phone)}</td>
        <td>${statusBadge(student.status)}</td>`,
  `        <td>${escapeHtml(student.faculty)}</td>
        <td>${escapeHtml(student.department || "-")}</td>
        <td>${escapeHtml(student.phone)}</td>
        <td>${statusBadge(student.status)}</td>`,
);

replaceRequired(
  "client/assets/js/pages/students.js",
  `    : tableEmpty(6);`,
  `    : tableEmpty(7);`,
);

replaceRequired(
  "client/assets/js/pages/students.js",
  `      email: form.email.value,
      emergencyContactPhone: form.emergencyContactPhone.value,`,
  `      email: form.email.value,
      faculty: form.faculty.value,
      department: form.department.value,
      emergencyContactPhone: form.emergencyContactPhone.value,`,
);

replaceRequired(
  "client/manager/courses.html",
  `placeholder="MTH"`,
  `placeholder="MTH 101"`,
);
replaceRequired(
  "client/manager/courses.html",
  `placeholder="Senior secondary"`,
  `placeholder="100 Level"`,
);

replaceRequired(
  "client/manager/semesters.html",
  `<div class="field"><label for="semesterName">Semester name</label><input id="semesterName" name="semesterName" placeholder="First Semester" required></div>`,
  `<div class="field"><label for="semesterName">Semester</label><select id="semesterName" name="semesterName" required><option value="">Select semester</option><option>First Semester</option><option>Second Semester</option></select></div>`,
);

replaceRequired(
  "README.md",
  "StudySync is a beginner-friendly Student Course Registration System for a university tutorial centre.",
  "StudySync is a beginner-friendly Student Course Registration System for a university tutorial centre. It manages students by faculty and department, course enrolments by semester, instructors, tutorial class lists, and instructor assignments.",
);

console.log("StudySync university tutorial-centre terminology refactor applied.");
