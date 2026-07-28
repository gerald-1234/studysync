from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


OUTPUT_PATH = Path(r"C:\Users\hp\Documents\StudySync_SAD_Report.docx")

BLUE = "1F4E78"
LIGHT_BLUE = "D9EAF7"
LIGHT_GRAY = "F2F2F2"
WHITE = "FFFFFF"
DARK_GRAY = "404040"


def set_cell_shading(cell, fill):
    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=90, bottom=90, end=90):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin_name, margin_value in {
        "top": top,
        "start": start,
        "bottom": bottom,
        "end": end,
    }.items():
        node = tc_mar.find(qn(f"w:{margin_name}"))
        if node is None:
            node = OxmlElement(f"w:{margin_name}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(margin_value))
        node.set(qn("w:type"), "dxa")


def set_run_font(run, size=11, bold=False, color=None, italic=False):
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_text(paragraph, text, size=11, bold=False, color=None, italic=False):
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color, italic=italic)
    return run


def add_heading(doc, text, level=1):
    paragraph = doc.add_paragraph(style=f"Heading {level}")
    add_text(paragraph, text, size={1: 14, 2: 12, 3: 11}.get(level, 11), bold=True, color=BLUE)
    return paragraph


def add_body(doc, text, bold_prefix=None):
    paragraph = doc.add_paragraph(style="Normal")
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if bold_prefix and text.startswith(bold_prefix):
        add_text(paragraph, bold_prefix, bold=True)
        add_text(paragraph, text[len(bold_prefix):])
    else:
        add_text(paragraph, text)
    return paragraph


def add_bullet(doc, text):
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.space_after = Pt(3)
    add_text(paragraph, text)
    return paragraph


def add_numbered(doc, text):
    paragraph = doc.add_paragraph(style="List Number")
    paragraph.paragraph_format.space_after = Pt(3)
    add_text(paragraph, text)
    return paragraph


def set_cell_text(cell, text, bold=False, color=None, size=9.5, align=None):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    if align is not None:
        paragraph.alignment = align
    for index, line in enumerate(str(text).split("\n")):
        if index:
            paragraph.add_run().add_break()
        add_text(paragraph, line, size=size, bold=bold, color=color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    set_cell_margins(cell)


def add_table(doc, headers, rows, widths=None, font_size=9.5):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    for index, header in enumerate(headers):
        cell = table.rows[0].cells[index]
        set_cell_shading(cell, BLUE)
        set_cell_text(
            cell,
            header,
            bold=True,
            color=WHITE,
            size=font_size,
            align=WD_ALIGN_PARAGRAPH.CENTER,
        )

    for row_index, row in enumerate(rows):
        cells = table.add_row().cells
        for index, value in enumerate(row):
            if row_index % 2 == 1:
                set_cell_shading(cells[index], LIGHT_GRAY)
            set_cell_text(cells[index], value, size=font_size)

    if widths:
        for row in table.rows:
            for index, width in enumerate(widths):
                row.cells[index].width = Cm(width)

    doc.add_paragraph()
    return table


def add_caption(doc, text):
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_after = Pt(8)
    add_text(paragraph, text, size=10, bold=True, italic=True)
    return paragraph


def add_diagram(doc, title, rows, column_widths=None):
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for row_index, values in enumerate(rows):
        for col_index, value in enumerate(values):
            cell = table.rows[row_index].cells[col_index]
            if value:
                fill = LIGHT_BLUE if value.startswith("[") else LIGHT_GRAY
                if "STUDYSYNC" in value.upper() or "PROCESS" in value.upper():
                    fill = BLUE
                    set_cell_text(
                        cell,
                        value,
                        bold=True,
                        color=WHITE,
                        size=9,
                        align=WD_ALIGN_PARAGRAPH.CENTER,
                    )
                else:
                    set_cell_text(
                        cell,
                        value,
                        bold=value.startswith("["),
                        size=9,
                        align=WD_ALIGN_PARAGRAPH.CENTER,
                    )
                set_cell_shading(cell, fill)
            else:
                set_cell_text(cell, "", size=9)
                cell._tc.get_or_add_tcPr().append(OxmlElement("w:noWrap"))

    if column_widths:
        for row in table.rows:
            for index, width in enumerate(column_widths):
                row.cells[index].width = Cm(width)
    doc.add_paragraph()
    add_caption(doc, title)
    return table


def add_page_number(paragraph):
    add_text(paragraph, "Page ", size=9)
    run = paragraph.add_run()
    set_run_font(run, size=9)
    fld_char_1 = OxmlElement("w:fldChar")
    fld_char_1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = "PAGE"
    fld_char_2 = OxmlElement("w:fldChar")
    fld_char_2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_1)
    run._r.append(instr_text)
    run._r.append(fld_char_2)


def add_toc_field(paragraph):
    run = paragraph.add_run()
    fld_char_1 = OxmlElement("w:fldChar")
    fld_char_1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = 'TOC \\o "1-3" \\h \\z \\u'
    fld_char_2 = OxmlElement("w:fldChar")
    fld_char_2.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "Table of Contents"
    fld_char_3 = OxmlElement("w:fldChar")
    fld_char_3.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_1)
    run._r.append(instr_text)
    run._r.append(fld_char_2)
    run._r.append(text)
    run._r.append(fld_char_3)


def configure_document(doc):
    section = doc.sections[0]
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(2.54)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    normal.font.size = Pt(11)
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(6)

    for style_name, size, before, after in [
        ("Heading 1", 14, 14, 8),
        ("Heading 2", 12, 12, 6),
        ("Heading 3", 11, 10, 4),
    ]:
        style = doc.styles[style_name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(BLUE)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    for style_name in ["List Bullet", "List Number"]:
        style = doc.styles[style_name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        style.font.size = Pt(11)

    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(header, "StudySync Student Course Registration System", size=9, color=DARK_GRAY)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_page_number(footer)


def add_title_page(doc):
    for _ in range(3):
        doc.add_paragraph()

    lines = [
        ("FEDERAL UNIVERSITY OF TECHNOLOGY, OWERRI", 14, True),
        ("(FUTO)", 13, True),
        ("", 12, False),
        ("SCHOOL OF INFORMATION AND COMMUNICATION TECHNOLOGY", 12, True),
        ("DEPARTMENT OF SOFTWARE ENGINEERING", 12, True),
        ("", 12, False),
        ("SOFTWARE ANALYSIS AND DESIGN REPORT", 16, True),
        ("ON", 12, True),
        ("STUDYSYNC STUDENT COURSE REGISTRATION SYSTEM", 16, True),
        ("", 12, False),
        ("A GROUP PROJECT REPORT", 12, True),
        ("", 12, False),
        (
            "Submitted in Partial Fulfilment of the Requirements for the Award "
            "of the Bachelor of Technology (B.Tech.) Degree in Software Engineering",
            11,
            False,
        ),
        ("", 12, False),
        ("Course: Software Analysis and Design", 11, False),
        ("Course Code: INS 204", 11, False),
        ("", 12, False),
        ("Submitted By", 11, True),
        ("[Insert Student Name(s) and Registration Number(s)]", 11, False),
        ("", 12, False),
        ("28th July, 2026", 11, False),
    ]

    for text, size, bold in lines:
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_after = Pt(5)
        add_text(paragraph, text, size=size, bold=bold)

    doc.add_page_break()


def add_table_of_contents(doc):
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(paragraph, "TABLE OF CONTENTS", size=14, bold=True, color=BLUE)
    doc.add_paragraph()
    toc = doc.add_paragraph()
    add_toc_field(toc)
    doc.add_paragraph()
    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(note, "The table of contents updates automatically when opened in Microsoft Word.", size=9, italic=True, color=DARK_GRAY)
    doc.add_page_break()


def chapter_one(doc):
    add_heading(doc, "CHAPTER ONE", 1)
    add_heading(doc, "PROJECT INITIATION AND PLANNING", 1)

    add_heading(doc, "1.0 Introduction", 2)
    add_body(
        doc,
        "Private tutoring centres support students who need additional instruction in subjects such as Mathematics, English Language, the sciences, and examination preparation. As a centre expands, it must keep accurate details of students, the subjects each student has selected, and the instructors responsible for teaching those subjects. When this information is stored in notebooks, paper forms, or separate spreadsheets, staff spend unnecessary time searching for records and checking who has been assigned to each class."
    )
    add_body(
        doc,
        "StudySync is proposed as a simple computerised Student Course Registration System for a small private tutoring centre. It will centralise student registration, subject management, course enrolment, and instructor assignment. This report documents the analysis and design of the proposed system and provides a practical blueprint for later implementation."
    )

    add_heading(doc, "1.1 Background of the Study", 2)
    add_body(
        doc,
        "Tutoring centres often begin with small paper-based processes because they are familiar and inexpensive. However, as student numbers and available subjects increase, manual records become difficult to maintain. A registration officer may record a student in one book, keep subject choices on a paper form, and check instructor assignments in another file. This arrangement makes it easy to lose information, register a learner twice for the same subject, or assign an instructor without seeing the number of students already enrolled."
    )
    add_body(
        doc,
        "A web-based registration system gives the centre one reliable source of information. It enables authorised users to find a student quickly, record subject choices consistently, view instructor allocations, and produce simple reports for planning. The proposed design focuses on the core activities the centre performs every term and deliberately avoids advanced modules that would make a first version harder to operate or defend."
    )

    add_heading(doc, "1.2 Problem Statement", 2)
    add_body(doc, "The current manual approach creates the following recurring problems:")
    for item in [
        "Student details can be duplicated, misplaced, or difficult to retrieve when they are kept in paper files or independent spreadsheets.",
        "Staff cannot easily confirm the subjects a student has registered for in a particular term.",
        "Instructor assignments are not centrally visible, making it difficult to know which instructor teaches each subject.",
        "A student may accidentally be recorded more than once for the same subject and term.",
        "Management cannot generate reliable totals for subject enrolment, instructor workload, or active students without manual counting.",
        "Paper records are vulnerable to loss, damage, and unauthorised viewing.",
        "Registration staff spend time repeating administrative work instead of serving students and parents promptly.",
    ]:
        add_bullet(doc, item)
    add_body(
        doc,
        "These issues reduce the centre's efficiency, create uncertainty in instructor planning, and make it harder to give students timely confirmation of their selected subjects."
    )

    add_heading(doc, "1.3 Aim of the Project", 2)
    add_body(
        doc,
        "The aim of this project is to analyse and design a simple, secure, and easy-to-use Student Course Registration System that enables a private tutoring centre to register students, enrol them in subjects, and track instructor assignments electronically."
    )

    add_heading(doc, "1.4 Project Objectives", 2)
    add_body(doc, "General Objective", bold_prefix="General Objective")
    add_body(
        doc,
        "To produce a complete system analysis and design for StudySync that improves the accuracy, speed, and visibility of the tutoring centre's student registration process."
    )
    add_body(doc, "Specific Objectives", bold_prefix="Specific Objectives")
    for item in [
        "Design a centralised database for student, instructor, subject, and enrolment information.",
        "Provide a secure login system with simple role-based access.",
        "Allow registration staff to create and update student profiles.",
        "Allow authorised staff to create and manage available subjects.",
        "Enable students to be enrolled in one or more subjects for an academic term.",
        "Prevent duplicate enrolment of the same student in the same subject and term.",
        "Enable managers to assign an instructor to a subject for a term.",
        "Provide instructors with a view of their assigned subjects and enrolled students.",
        "Generate simple enrolment and instructor-assignment reports for management.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "1.5 Project Scope", 2)
    add_body(
        doc,
        "The first version of StudySync is limited to the centre's registration and allocation workflow. The boundaries below keep the proposed implementation realistic for a student project and easy for staff to learn."
    )
    add_table(
        doc,
        ["Area", "Included Functions"],
        [
            ["User Management", "Login, logout, password reset, role-based access for administrator, registration officer, instructor, and manager."],
            ["Student Management", "Student registration, profile update, search, status management, and registration number generation."],
            ["Subject Management", "Create, update, activate, or deactivate subjects offered by the centre."],
            ["Course Registration", "Select subjects for a student, record the academic term, prevent duplicate enrolment, and view enrolment history."],
            ["Instructor Management", "Store instructor profiles and assign an instructor to each active subject for a term."],
            ["Reporting", "Student list, subject enrolment totals, instructor assignment list, and student registration summary."],
        ],
        widths=[3.2, 12.8],
    )
    add_body(doc, "Out of Scope", bold_prefix="Out of Scope")
    add_body(
        doc,
        "This version will not process tuition fees, attendance, examination results, online lessons, parent messaging, payroll, timetable generation, biometric verification, or integration with external school systems. These functions may be added later after the core registration process is stable."
    )

    add_heading(doc, "1.6 Project Charter", 2)
    add_table(
        doc,
        ["Item", "Detail"],
        [
            ["Project Title", "StudySync Student Course Registration System"],
            ["Project Sponsor", "Management of the private tutoring centre"],
            ["Problem Addressed", "Manual student registration, unclear subject selections, and poorly tracked instructor assignments."],
            ["Project Team", "Software Analysis and Design student project team"],
            ["Phase 1", "Project initiation: problem identification, stakeholder analysis, and feasibility study."],
            ["Phase 2", "Requirements analysis: user stories, functional and non-functional requirements, and DFDs."],
            ["Phase 3", "System design: ERD, normalisation, database schema, interfaces, and architecture."],
            ["Phase 4", "Documentation: final system specification report."],
            ["Phase 5", "Presentation: demonstration and project defence."],
        ],
        widths=[4.2, 11.8],
    )
    add_body(
        doc,
        "Expected deliverables are a project charter and feasibility study, requirements specification, data flow diagrams, entity-relationship diagram, normalised database schema, user interface designs, system architecture, and this final report."
    )

    add_heading(doc, "1.7 Stakeholder Analysis", 2)
    add_table(
        doc,
        ["Stakeholder", "Role", "Primary Interest"],
        [
            ["Centre Manager", "Project sponsor and decision maker", "Accurate registration records, clear instructor allocation, and reports for planning."],
            ["Registration Officer", "Primary system user", "Quick student registration, subject enrolment, and reliable search."],
            ["Student", "End user / beneficiary", "Correct registration, confirmation of selected subjects, and access to own subject list."],
            ["Instructor", "System user", "Clear view of assigned subjects and the students enrolled in them."],
            ["System Administrator", "Technical support user", "Account management, access control, backups, and audit review."],
            ["Project Team", "Analysis and design team", "A clear, testable, and implementable system specification."],
        ],
        widths=[3.5, 5.0, 7.5],
    )

    add_heading(doc, "1.8 Stakeholder Interaction Overview", 2)
    add_body(
        doc,
        "Figure 1.1 shows the main users and the information each group exchanges with StudySync. Registration officers carry out most data-entry tasks, while instructors and managers use the resulting information for teaching and planning."
    )
    add_diagram(
        doc,
        "Figure 1.1: Stakeholder Interaction Overview",
        [
            ["[Student]", "Registration details and subject choices", "[STUDYSYNC]", "Registration confirmation and enrolled subjects", "[Registration Officer]"],
            ["[Instructor]", "Assigned subjects and class list", "[STUDYSYNC]", "Instructor profile and availability", "[Centre Manager]"],
            ["[System Administrator]", "Accounts, roles, and backup controls", "[STUDYSYNC]", "Reports and audit information", ""],
        ],
        column_widths=[2.6, 3.8, 3.4, 3.8, 2.6],
    )

    add_heading(doc, "1.9 Feasibility Study", 2)
    add_body(
        doc,
        "A feasibility study was performed to confirm that StudySync can be built and adopted by a small tutoring centre. The study considers technical, economic, and operational feasibility."
    )

    add_heading(doc, "1.9.1 Technical Feasibility", 3)
    add_body(
        doc,
        "The required technology is common, affordable, and available. StudySync can be implemented as a small web application using a modern browser, a web server, and a relational database such as MySQL or PostgreSQL. The centre does not need specialised equipment beyond existing computers, reliable internet access for hosted deployment, and a backup solution."
    )
    add_table(
        doc,
        ["Requirement Category", "Items"],
        [
            ["Hardware", "One administrator computer, registration desk computer, optional instructor access devices, router, UPS, and backup storage."],
            ["Software", "Windows or Linux, modern browser, Node.js or PHP backend, MySQL or PostgreSQL database, Git, and antivirus software."],
            ["Network", "Reliable local network or internet connection, HTTPS hosting, and a basic firewall."],
            ["People", "One administrator, registration officer, centre manager, instructors, and a small development team."],
        ],
        widths=[4.0, 12.0],
    )

    add_heading(doc, "1.9.2 Economic Feasibility", 3)
    add_body(
        doc,
        "The expected cost is modest because the system uses widely available software and can run on existing office computers. The estimates below are illustrative for a small centre and should be adjusted to actual local quotations before implementation."
    )
    add_table(
        doc,
        ["Cost Item", "Estimated Cost (NGN)"],
        [
            ["System analysis and design", "100,000"],
            ["Software development", "350,000"],
            ["Hardware / connectivity improvements", "150,000"],
            ["Staff training", "75,000"],
            ["Testing and deployment", "75,000"],
            ["Contingency", "100,000"],
            ["Total", "850,000"],
        ],
        widths=[10.5, 5.5],
    )
    add_body(
        doc,
        "Expected benefits include less paper use, reduced time spent searching for records, fewer duplicate enrolments, better planning of instructor workload, and faster access to enrolment totals. These benefits are expected to justify the initial investment over time."
    )

    add_heading(doc, "1.9.3 Operational Feasibility", 3)
    add_body(
        doc,
        "StudySync is operationally feasible because it follows the centre's existing workflow: register a student, choose subjects, assign instructors, and review reports. Short role-based training will be sufficient because each user sees only the functions needed for that role. The centre should introduce the system at the beginning of a term, run it alongside paper records briefly, and use staff feedback to correct small usability issues before full adoption."
    )

    add_heading(doc, "1.10 Chapter Summary", 2)
    add_body(
        doc,
        "This chapter introduced StudySync, described the weaknesses of the manual registration process, defined the project aim, objectives, scope, stakeholders, and charter, and established that the project is technically, economically, and operationally feasible. Chapter Two converts stakeholder needs into detailed system requirements and process models."
    )


def chapter_two(doc):
    doc.add_page_break()
    add_heading(doc, "CHAPTER TWO", 1)
    add_heading(doc, "REQUIREMENTS ANALYSIS", 1)

    add_heading(doc, "2.0 Introduction", 2)
    add_body(
        doc,
        "Requirements analysis identifies what StudySync must do and the quality standards it must meet before implementation begins. The requirements in this chapter were derived from the typical workflow of a small tutoring centre: students are registered, subjects are selected for a term, instructors are assigned to subjects, and management checks registration totals."
    )

    add_heading(doc, "2.1 Requirements Gathering Methodology", 2)
    add_body(
        doc,
        "Four simple techniques were used to identify requirements. Interviews with a centre manager and registration officer reveal daily operational needs. Observation of the current registration process identifies repeated manual steps and possible errors. Existing registration forms show the data the system must capture. Finally, short scenarios were used to express how students, instructors, and staff should interact with the proposed system."
    )

    add_heading(doc, "2.2 Stakeholder Requirements", 2)
    add_table(
        doc,
        ["Stakeholder", "Primary Requirements"],
        [
            ["Student", "Be registered once, select available subjects, view selected subjects, and receive a clear registration confirmation."],
            ["Registration Officer", "Create and update student profiles, search quickly, select subjects, and correct enrolment errors where authorised."],
            ["Instructor", "View assigned subjects and the list of students registered in each subject."],
            ["Centre Manager", "Create subjects, assign instructors, view enrolment totals, and monitor instructor allocations."],
            ["System Administrator", "Create user accounts, assign roles, reset passwords, back up data, and review important user activity."],
        ],
        widths=[4.0, 12.0],
    )

    add_heading(doc, "2.3 Current Versus Proposed Workflow", 2)
    add_body(
        doc,
        "The existing process relies on paper forms and separate records. The proposed workflow uses one central database and checks rules at the time data is entered."
    )
    add_diagram(
        doc,
        "Figure 2.1: Current Manual Workflow Versus Proposed StudySync Workflow",
        [
            ["CURRENT MANUAL PROCESS", "", "PROPOSED STUDYSYNC PROCESS"],
            ["Student fills paper form", "->", "Registration officer opens student profile"],
            ["Staff writes subject choices in register", "->", "Officer selects active subjects for the term"],
            ["Manager checks separate instructor list", "->", "Manager assigns instructor to subject in system"],
            ["Totals counted manually", "->", "Reports generated from central database"],
        ],
        column_widths=[6.8, 1.2, 8.0],
    )
    add_body(
        doc,
        "The proposed process gives the centre one searchable record of each student, instant confirmation of selected subjects, visible instructor allocation, and reports that do not depend on manual counting."
    )

    add_heading(doc, "2.4 User Stories", 2)
    add_body(
        doc,
        "The following user stories express the expected system behaviour from the perspective of each stakeholder group. They are used to derive the functional requirements in Section 2.5."
    )
    for story in [
        "As a student, I want my registration details stored once so that the centre can identify me correctly each term.",
        "As a student, I want to see the subjects selected for me so that I can confirm my registration is correct.",
        "As a registration officer, I want to search for a student before creating a record so that duplicate profiles are avoided.",
        "As a registration officer, I want to enrol a student in available subjects for a selected term so that their choices are recorded accurately.",
        "As an instructor, I want to view my assigned subjects so that I know what I am responsible for teaching.",
        "As an instructor, I want to view the students enrolled in my assigned subjects so that I can prepare for class.",
        "As a centre manager, I want to assign an instructor to a subject so that every active subject has a clear teaching responsibility.",
        "As a centre manager, I want enrolment reports by subject so that I can plan class sizes and resources.",
        "As a system administrator, I want to assign user roles so that users only access functions relevant to their work.",
    ]:
        add_bullet(doc, story)

    add_heading(doc, "2.5 Functional Requirements", 2)
    add_table(
        doc,
        ["ID", "Functional Requirement"],
        [
            ["FR-01", "The system shall authenticate users before granting access."],
            ["FR-02", "The system shall allow an administrator to create, deactivate, and reset user accounts."],
            ["FR-03", "The system shall create and update student profiles."],
            ["FR-04", "The system shall generate or store a unique registration number for each student."],
            ["FR-05", "The system shall allow authorised users to search and view student records."],
            ["FR-06", "The system shall create, update, activate, and deactivate subjects."],
            ["FR-07", "The system shall create and manage instructor profiles."],
            ["FR-08", "The system shall define academic terms used for registration."],
            ["FR-09", "The system shall enrol a student in one or more active subjects for a term."],
            ["FR-10", "The system shall prevent the same student from being enrolled twice in the same subject and term."],
            ["FR-11", "The system shall allow an authorised manager to cancel or change an enrolment while preserving the record."],
            ["FR-12", "The system shall assign one active instructor to a subject for a term."],
            ["FR-13", "The system shall allow instructors to view their assigned subjects and enrolled students."],
            ["FR-14", "The system shall generate student, subject enrolment, and instructor assignment reports."],
            ["FR-15", "The system shall enforce role-based permissions."],
            ["FR-16", "The system shall record important actions such as account creation, enrolment, and assignment changes in an audit log."],
            ["FR-17", "The system shall perform regular database backups."],
        ],
        widths=[2.0, 14.0],
    )

    add_heading(doc, "2.6 Non-Functional Requirements", 2)
    add_table(
        doc,
        ["Category", "Requirement"],
        [
            ["Performance", "Student search results should appear within 3 seconds under normal centre use; saving an enrolment should complete within 5 seconds."],
            ["Security", "All users must authenticate; passwords must be stored as hashes; data must be accessible only to authorised roles; sensitive actions must be logged."],
            ["Availability", "The system should be available during centre operating hours, with planned maintenance scheduled outside busy periods."],
            ["Reliability", "The database must be backed up daily and a recovery procedure must be documented and tested."],
            ["Usability", "Forms must use clear labels, simple navigation, validation messages, and a consistent layout that needs minimal training."],
            ["Maintainability", "The application must use separate interface, business logic, and database layers so changes can be made without rewriting the entire system."],
            ["Scalability", "The design should allow later addition of fees, attendance, results, and parent notifications without changing the existing core tables."],
        ],
        widths=[3.2, 12.8],
    )

    add_heading(doc, "2.7 Business Rules", 2)
    for rule in [
        "Every student must have a unique registration number before enrolment can be completed.",
        "Only active subjects may be selected for a new enrolment.",
        "A student may enrol in many subjects, but only once per subject within the same academic term.",
        "Every enrolment must reference exactly one student, one subject, and one academic term.",
        "Only an active instructor may be assigned to a subject.",
        "A subject may have only one active instructor assignment for a particular academic term in this first version.",
        "Instructors can view only their own assigned subjects and the students enrolled in those subjects.",
        "Cancelled enrolments and assignments remain in the database with a status for audit purposes.",
        "Only administrators may manage user accounts and roles.",
    ]:
        add_bullet(doc, rule)

    add_heading(doc, "2.8 Requirements Traceability Matrix", 2)
    add_body(
        doc,
        "The traceability matrix links important user needs to the functional requirements and modules that will deliver them. It helps ensure that design decisions are connected to stakeholder expectations."
    )
    add_table(
        doc,
        ["User Need", "Functional Requirements", "System Module"],
        [
            ["Accurate student registration", "FR-03, FR-04, FR-05", "Student Management"],
            ["Subject selection by term", "FR-06, FR-08, FR-09, FR-10", "Course Registration"],
            ["Correction of registration", "FR-11", "Course Registration"],
            ["Instructor allocation", "FR-07, FR-12", "Instructor Assignment"],
            ["Instructor class list", "FR-13", "Instructor Dashboard"],
            ["Management summary", "FR-14", "Reporting"],
            ["Controlled access", "FR-01, FR-02, FR-15", "Security and User Management"],
            ["Accountability and recovery", "FR-16, FR-17", "Audit and Backup"],
        ],
        widths=[4.2, 5.0, 6.8],
    )

    add_heading(doc, "2.9 Process Modelling: Data Flow Diagrams", 2)
    add_body(
        doc,
        "The context diagram treats StudySync as one process and shows data exchanged with external entities. The Level-0 DFD then breaks the system into its main internal processes and data stores."
    )
    add_diagram(
        doc,
        "Figure 2.2: Context Diagram for StudySync",
        [
            ["[Student]", "Registration details / selected subjects", "[STUDYSYNC STUDENT COURSE REGISTRATION SYSTEM]", "Confirmation / subject list", "[Registration Officer]"],
            ["[Instructor]", "View request", "[STUDYSYNC STUDENT COURSE REGISTRATION SYSTEM]", "Assigned subjects / class list", "[Centre Manager]"],
            ["", "", "[STUDYSYNC STUDENT COURSE REGISTRATION SYSTEM]", "Reports / allocation status", ""],
        ],
        column_widths=[2.5, 3.7, 4.3, 3.7, 2.5],
    )
    add_diagram(
        doc,
        "Figure 2.3: Level-0 Data Flow Diagram",
        [
            ["[Registration Officer]", "1.0 Manage Student Profiles", "D1 Student Data", ""],
            ["[System Administrator]", "2.0 Manage User Accounts", "D2 User Accounts", ""],
            ["[Centre Manager]", "3.0 Manage Subjects and Assignments", "D3 Subjects / D4 Instructor Assignments", "[Instructor]"],
            ["[Student / Registration Officer]", "4.0 Process Subject Enrolment", "D5 Enrolments / D6 Academic Terms", ""],
            ["[Centre Manager]", "5.0 Generate Reports", "D1-D6", "[Centre Manager]"],
        ],
        column_widths=[3.4, 4.6, 5.2, 2.8],
    )

    add_heading(doc, "2.10 Chapter Summary", 2)
    add_body(
        doc,
        "This chapter translated stakeholder needs into user stories, functional and non-functional requirements, business rules, a traceability matrix, and data flow diagrams. These requirements provide the basis for the data model and database design in Chapter Three."
    )


def chapter_three(doc):
    doc.add_page_break()
    add_heading(doc, "CHAPTER THREE", 1)
    add_heading(doc, "DATA MODELLING AND DATABASE DESIGN", 1)

    add_heading(doc, "3.0 Introduction", 2)
    add_body(
        doc,
        "Data modelling defines how StudySync stores and relates information. A properly structured database reduces duplication, protects data integrity, and makes common tasks such as finding a student's subjects or an instructor's class list easier to perform. This chapter identifies the main entities, their attributes and relationships, and normalises the design to Third Normal Form (3NF)."
    )

    add_heading(doc, "3.1 Data Modelling Objectives", 2)
    for objective in [
        "Store each student, instructor, subject, and term only once in the appropriate table.",
        "Record student subject selections without duplicating student or subject details.",
        "Record instructor assignments separately from enrolments because the two activities are different.",
        "Enforce valid relationships through primary keys, foreign keys, and unique constraints.",
        "Support reports on enrolment numbers and instructor workload.",
        "Leave a clear path for future modules such as attendance, fees, and results.",
    ]:
        add_bullet(doc, objective)

    add_heading(doc, "3.2 Core Entities", 2)
    add_body(
        doc,
        "Seven core entities were identified from the requirements. The design uses the word subject for the tutoring unit a student selects; in practical use, a subject may be Mathematics, English Language, Biology, or another course offered by the centre."
    )
    add_table(
        doc,
        ["Entity", "Description"],
        [
            ["User_Account", "Login credentials and role assigned to an authorised system user."],
            ["Student", "Personal and registration information for a learner enrolled at the tutoring centre."],
            ["Instructor", "Professional and contact information for a tutor who may teach one or more subjects."],
            ["Subject", "A subject offered by the centre, such as Mathematics or Physics."],
            ["Academic_Term", "The term or session during which enrolments and teaching assignments are valid."],
            ["Enrolment", "A student's registration for one subject in one academic term."],
            ["Instructor_Assignment", "The allocation of one instructor to one subject in one academic term."],
        ],
        widths=[4.0, 12.0],
    )

    add_heading(doc, "3.3 Entity Attributes", 2)
    add_table(
        doc,
        ["Entity", "Key Attributes"],
        [
            ["USER_ACCOUNT", "UserID (PK), Username, PasswordHash, Role, AccountStatus, LastLogin, CreatedAt"],
            ["STUDENT", "StudentID (PK), UserID (FK, optional), RegistrationNumber, FirstName, LastName, Gender, PhoneNumber, EmailAddress, GuardianPhone, RegistrationDate, StudentStatus"],
            ["INSTRUCTOR", "InstructorID (PK), UserID (FK, optional), StaffNumber, FirstName, LastName, PhoneNumber, EmailAddress, Qualification, InstructorStatus"],
            ["SUBJECT", "SubjectID (PK), SubjectCode, SubjectName, Description, Level, SubjectStatus"],
            ["ACADEMIC_TERM", "TermID (PK), TermName, AcademicSession, StartDate, EndDate, TermStatus"],
            ["ENROLMENT", "EnrolmentID (PK), StudentID (FK), SubjectID (FK), TermID (FK), EnrolmentDate, EnrolmentStatus"],
            ["INSTRUCTOR_ASSIGNMENT", "AssignmentID (PK), InstructorID (FK), SubjectID (FK), TermID (FK), AssignedDate, AssignmentStatus"],
        ],
        widths=[4.2, 11.8],
        font_size=8.7,
    )

    add_heading(doc, "3.4 Relationship Analysis", 2)
    add_table(
        doc,
        ["Relationship", "Cardinality", "Business Rule"],
        [
            ["Student to Enrolment", "1 : M", "One student may have many enrolment records over different subjects and terms."],
            ["Subject to Enrolment", "1 : M", "One subject may be selected by many students."],
            ["Academic_Term to Enrolment", "1 : M", "One term may contain many student enrolments."],
            ["Instructor to Instructor_Assignment", "1 : M", "One instructor may teach several subjects or terms."],
            ["Subject to Instructor_Assignment", "1 : M", "A subject can have assignments over different terms; only one may be active per term in this version."],
            ["Academic_Term to Instructor_Assignment", "1 : M", "One term may contain many instructor assignments."],
            ["User_Account to Student / Instructor", "1 : 0..1", "A login account may be linked to a student or instructor profile where self-service access is enabled."],
        ],
        widths=[4.5, 2.5, 9.0],
    )

    add_heading(doc, "3.5 Entity-Relationship Diagram", 2)
    add_body(
        doc,
        "Figure 3.1 presents the logical relationships among the entities. The Enrolment entity resolves the many-to-many relationship between Student and Subject, while Instructor_Assignment records who teaches each subject in a term."
    )
    add_diagram(
        doc,
        "Figure 3.1: Entity-Relationship Diagram for StudySync",
        [
            ["[STUDENT]", "1 ----<", "[ENROLMENT]", ">---- 1", "[SUBJECT]"],
            ["[ACADEMIC_TERM]", "1 ----<", "[ENROLMENT]", "", ""],
            ["[INSTRUCTOR]", "1 ----<", "[INSTRUCTOR_ASSIGNMENT]", ">---- 1", "[SUBJECT]"],
            ["[ACADEMIC_TERM]", "1 ----<", "[INSTRUCTOR_ASSIGNMENT]", "", ""],
            ["[USER_ACCOUNT]", "0..1 ----", "[STUDENT / INSTRUCTOR]", "", ""],
        ],
        column_widths=[3.0, 2.1, 4.3, 2.1, 3.0],
    )

    add_heading(doc, "3.6 Database Normalisation", 2)
    add_body(
        doc,
        "The database is normalised to Third Normal Form (3NF) to reduce redundancy and prevent update, insertion, and deletion anomalies. The following example begins with an unnormalised record that combines student, subject, and instructor information in one table."
    )

    add_heading(doc, "3.6.1 Unnormalised Form (UNF)", 3)
    add_table(
        doc,
        ["StudentNo", "StudentName", "Term", "SelectedSubjects", "AssignedInstructors", "Phone"],
        [
            ["SS001", "Ada Okafor", "First Term 2026/2027", "Mathematics, English Language", "Mr. Obi, Mrs. Nwosu", "08030000001"],
            ["SS002", "Emeka James", "First Term 2026/2027", "Mathematics, Physics", "Mr. Obi, Mr. Bello", "08030000002"],
        ],
        widths=[2.0, 3.0, 3.6, 3.8, 3.8, 2.0],
        font_size=8.5,
    )
    add_body(
        doc,
        "This form contains repeating groups because several subjects and instructors are stored in single fields. It also repeats student details and makes accurate searching or reporting difficult."
    )

    add_heading(doc, "3.6.2 First Normal Form (1NF)", 3)
    add_body(
        doc,
        "To reach First Normal Form, every field must contain one atomic value. The repeating subject and instructor lists are split into individual rows. Each enrolment row now contains one student, one subject, one instructor reference, and one term."
    )
    add_table(
        doc,
        ["EnrolmentID", "StudentNo", "StudentName", "Subject", "Term", "Instructor"],
        [
            ["E001", "SS001", "Ada Okafor", "Mathematics", "First Term 2026/2027", "Mr. Obi"],
            ["E002", "SS001", "Ada Okafor", "English Language", "First Term 2026/2027", "Mrs. Nwosu"],
            ["E003", "SS002", "Emeka James", "Mathematics", "First Term 2026/2027", "Mr. Obi"],
        ],
        widths=[2.0, 2.0, 3.0, 3.3, 3.6, 2.4],
        font_size=8.5,
    )

    add_heading(doc, "3.6.3 Second Normal Form (2NF)", 3)
    add_body(
        doc,
        "In the 1NF table, student name and phone depend on the student, while instructor name depends on the instructor. These attributes do not depend on the enrolment itself. The design is therefore decomposed into STUDENT, INSTRUCTOR, SUBJECT, ACADEMIC_TERM, ENROLMENT, and INSTRUCTOR_ASSIGNMENT. Student and instructor details are now stored once and referenced by keys."
    )

    add_heading(doc, "3.6.4 Third Normal Form (3NF)", 3)
    add_body(
        doc,
        "To reach Third Normal Form, transitive dependencies are removed. For example, subject name and subject level are stored only in SUBJECT, and term name and dates are stored only in ACADEMIC_TERM. The final tables listed in Section 3.3 ensure that every non-key attribute depends on the key, the whole key, and nothing but the key."
    )

    add_heading(doc, "3.7 Final Logical Schema", 2)
    add_diagram(
        doc,
        "Figure 3.2: Final Logical Schema Overview",
        [
            ["USER_ACCOUNT", "UserID (PK), Username, PasswordHash, Role"],
            ["STUDENT", "StudentID (PK), RegistrationNumber, UserID (FK), contact details"],
            ["INSTRUCTOR", "InstructorID (PK), StaffNumber, UserID (FK), contact details"],
            ["SUBJECT", "SubjectID (PK), SubjectCode, SubjectName, Status"],
            ["ACADEMIC_TERM", "TermID (PK), TermName, Session, dates, Status"],
            ["ENROLMENT", "EnrolmentID (PK), StudentID (FK), SubjectID (FK), TermID (FK), Status"],
            ["INSTRUCTOR_ASSIGNMENT", "AssignmentID (PK), InstructorID (FK), SubjectID (FK), TermID (FK), Status"],
        ],
        column_widths=[5.0, 11.0],
    )

    add_heading(doc, "3.8 Benefits of the Database Design", 2)
    for benefit in [
        "Student and instructor information is stored once, reducing duplicate data.",
        "Primary and foreign keys preserve valid relationships between records.",
        "A unique enrolment constraint prevents duplicate subject registration for the same term.",
        "Instructor assignments are separated from enrolments, making workload reports simpler.",
        "Historical term records can be kept without overwriting the current term.",
        "The schema can be extended later with attendance, payment, and result tables.",
    ]:
        add_bullet(doc, benefit)

    add_heading(doc, "3.9 Chapter Summary", 2)
    add_body(
        doc,
        "This chapter identified StudySync's seven core entities, analysed their relationships, presented the ERD, and normalised the data design to 3NF. Chapter Four uses this model to define the final physical schema, user interfaces, architecture, and security controls."
    )


def chapter_four(doc):
    doc.add_page_break()
    add_heading(doc, "CHAPTER FOUR", 1)
    add_heading(doc, "SYSTEM DESIGN AND INTERFACE PROTOTYPING", 1)

    add_heading(doc, "4.0 Introduction", 2)
    add_body(
        doc,
        "This chapter converts the requirements and data model into an implementation blueprint. It describes the interface screens, final database schema, application architecture, and security controls required for StudySync. The design favours simple forms, clear roles, and a small number of modules so that it remains suitable for a private tutoring centre and straightforward to defend."
    )

    add_heading(doc, "4.1 Design Principles", 2)
    add_table(
        doc,
        ["Principle", "How It Is Applied"],
        [
            ["Simplicity", "Users see only the fields and actions needed for their role; forms avoid unnecessary information."],
            ["Consistency", "The same navigation, button labels, validation style, and table layout are used across all modules."],
            ["Accuracy", "Required fields, unique registration numbers, controlled subject lists, and duplicate checks reduce data-entry errors."],
            ["Security", "Authentication, role-based permissions, password hashing, audit logs, and backups protect system data."],
            ["Maintainability", "The application separates interface, business logic, and database layers so changes remain localised."],
            ["Scalability", "Tables and modules can support future features such as attendance, payments, and results without replacing the core design."],
        ],
        widths=[3.5, 12.5],
    )

    add_heading(doc, "4.2 User Interface Design", 2)
    add_body(
        doc,
        "StudySync uses role-based dashboards. An administrator manages accounts, a registration officer registers students and subjects, a manager assigns instructors and reads reports, and an instructor sees only allocated subjects and enrolled students."
    )
    add_diagram(
        doc,
        "Figure 4.1: StudySync Interface Navigation Overview",
        [
            ["[LOGIN]", "->", "[ROLE DASHBOARD]", "->", "[STUDENT MANAGEMENT]"],
            ["", "", "[ROLE DASHBOARD]", "->", "[SUBJECT ENROLMENT]"],
            ["", "", "[ROLE DASHBOARD]", "->", "[INSTRUCTOR ASSIGNMENT]"],
            ["", "", "[ROLE DASHBOARD]", "->", "[REPORTS]"],
        ],
        column_widths=[3.0, 1.2, 4.4, 1.2, 6.2],
    )

    add_heading(doc, "4.2.1 Login Screen", 3)
    add_body(
        doc,
        "The login screen contains a username or email field, password field, login button, and password-reset option. It must display a clear message for invalid credentials without revealing whether a particular username exists."
    )
    add_table(
        doc,
        ["Field", "Validation Rule"],
        [
            ["Username / Email", "Required; must match an active account."],
            ["Password", "Required; password is verified against the stored hash."],
            ["Role Access", "After successful login, the dashboard is determined by the user's assigned role."],
            ["Failed Login", "Invalid attempts are recorded; repeated failures may temporarily lock the account."],
        ],
        widths=[4.5, 11.5],
    )

    add_heading(doc, "4.2.2 Student Registration Screen", 3)
    add_body(
        doc,
        "The student registration form captures the minimum information required to identify and contact a learner. A search option should appear before the create action so staff can check whether a record already exists."
    )
    add_table(
        doc,
        ["Field", "Validation Rule"],
        [
            ["Registration Number", "Required and unique; generated by the system or entered according to the centre's approved format."],
            ["First and Last Name", "Required; alphabetic characters, spaces, hyphens, and apostrophes only."],
            ["Gender", "Required selection from a controlled list."],
            ["Phone Number", "Required; numeric format with reasonable length validation."],
            ["Email Address", "Optional, but must use a valid email format when supplied."],
            ["Guardian Phone", "Required for centre contact and follow-up."],
            ["Student Status", "Required; Active or Inactive."],
        ],
        widths=[4.5, 11.5],
    )

    add_heading(doc, "4.2.3 Subject Enrolment Screen", 3)
    add_body(
        doc,
        "The enrolment screen first identifies the student, then shows active subjects for the selected term. The registration officer selects one or more subjects and saves them. The system validates each selection before creating enrolment records."
    )
    add_table(
        doc,
        ["Field / Action", "Validation Rule"],
        [
            ["Student", "Required; student must exist and have Active status."],
            ["Academic Term", "Required; only an active or open term can receive new enrolments."],
            ["Subject Selection", "At least one active subject must be selected."],
            ["Duplicate Check", "The same student cannot be enrolled in the same subject twice in the selected term."],
            ["Save Enrolment", "System stores enrolment date and Active status, then displays confirmation."],
        ],
        widths=[4.5, 11.5],
    )

    add_heading(doc, "4.2.4 Instructor Assignment and Reports", 3)
    add_body(
        doc,
        "The manager's assignment screen lists active instructors, active subjects, and the selected academic term. Once an assignment is saved, the selected instructor sees the subject and its registered students on the instructor dashboard. The report screen provides simple filters for term, subject, instructor, and student status."
    )
    add_table(
        doc,
        ["Report", "Purpose"],
        [
            ["Student Registration List", "Shows registered students and contact information, filtered by status or date."],
            ["Subject Enrolment Report", "Shows total students registered in each subject for a selected term."],
            ["Instructor Assignment Report", "Shows the instructor assigned to each subject for a selected term."],
            ["Instructor Class List", "Shows students enrolled in a selected subject assigned to the logged-in instructor."],
            ["Term Registration Summary", "Shows totals for active students, subjects, enrolments, and instructor assignments."],
        ],
        widths=[5.0, 11.0],
    )

    add_heading(doc, "4.3 Final Database Schema", 2)
    add_body(
        doc,
        "Table 4.1 summarises the physical schema derived from the normalised data model. Specific data types can be adjusted to suit the selected database platform, but the primary and foreign key relationships must remain unchanged."
    )
    add_table(
        doc,
        ["Table", "Key Columns (Type)"],
        [
            ["USER_ACCOUNT", "UserID INT (PK); Username VARCHAR(50) UNIQUE; PasswordHash VARCHAR(255); Role VARCHAR(30); AccountStatus VARCHAR(20); LastLogin DATETIME; CreatedAt DATETIME."],
            ["STUDENT", "StudentID INT (PK); UserID INT (FK, NULL); RegistrationNumber VARCHAR(30) UNIQUE; FirstName, LastName VARCHAR(50); Gender VARCHAR(15); PhoneNumber VARCHAR(20); EmailAddress VARCHAR(100); GuardianPhone VARCHAR(20); RegistrationDate DATE; StudentStatus VARCHAR(20)."],
            ["INSTRUCTOR", "InstructorID INT (PK); UserID INT (FK, NULL); StaffNumber VARCHAR(30) UNIQUE; FirstName, LastName VARCHAR(50); PhoneNumber VARCHAR(20); EmailAddress VARCHAR(100); Qualification VARCHAR(100); InstructorStatus VARCHAR(20)."],
            ["SUBJECT", "SubjectID INT (PK); SubjectCode VARCHAR(20) UNIQUE; SubjectName VARCHAR(100); Description TEXT; Level VARCHAR(30); SubjectStatus VARCHAR(20)."],
            ["ACADEMIC_TERM", "TermID INT (PK); TermName VARCHAR(50); AcademicSession VARCHAR(20); StartDate DATE; EndDate DATE; TermStatus VARCHAR(20)."],
            ["ENROLMENT", "EnrolmentID INT (PK); StudentID, SubjectID, TermID INT (FK); EnrolmentDate DATE; EnrolmentStatus VARCHAR(20); UNIQUE(StudentID, SubjectID, TermID)."],
            ["INSTRUCTOR_ASSIGNMENT", "AssignmentID INT (PK); InstructorID, SubjectID, TermID INT (FK); AssignedDate DATE; AssignmentStatus VARCHAR(20); UNIQUE(SubjectID, TermID, AssignmentStatus) for active assignment."],
        ],
        widths=[4.0, 12.0],
        font_size=8.2,
    )

    add_heading(doc, "4.4 System Architecture", 2)
    add_body(
        doc,
        "StudySync adopts a basic three-tier client-server architecture. The presentation layer contains the web pages used by staff and instructors. The application layer applies validation and business rules. The data layer stores all approved records in a relational database. This separation makes the system easier to test and maintain."
    )
    add_diagram(
        doc,
        "Figure 4.2: Three-Tier Architecture for StudySync",
        [
            ["PRESENTATION LAYER", "APPLICATION LAYER", "DATA LAYER"],
            ["Web browser for administrator, registration officer, manager, and instructor", "Web application: authentication, student management, enrolment, assignment, reporting", "Relational database: users, students, instructors, subjects, terms, enrolments, assignments"],
            ["HTTPS requests", "Business rules and validation", "Backups and controlled access"],
        ],
        column_widths=[5.3, 5.3, 5.4],
    )

    add_heading(doc, "4.5 Security Design", 2)
    for control in [
        "Role-Based Access Control (RBAC) limits each role to relevant functions.",
        "Passwords are stored as secure hashes, never as plain text.",
        "All communication between browser and server should use HTTPS after deployment.",
        "User sessions should expire after a period of inactivity.",
        "Input validation prevents blank required fields, duplicate records, and invalid data formats.",
        "Important events such as account changes, enrolment updates, and assignment changes are recorded in an audit log.",
        "The database should be backed up daily and restoration should be tested periodically.",
        "Only authorised administrators can create accounts, change roles, or deactivate users.",
    ]:
        add_bullet(doc, control)

    add_heading(doc, "4.6 Design Justification", 2)
    add_body(
        doc,
        "The proposed design is intentionally modular but not complex. It uses only the tables and screens required to manage registration and instructor allocation. Separating enrolment from instructor assignment reflects the centre's real workflow: a student choosing a subject is different from a manager deciding who will teach it. Role-specific dashboards reduce unnecessary options, while the three-tier architecture and 3NF database leave room for later features without forcing a redesign of the core system."
    )

    add_heading(doc, "4.7 Chapter Summary", 2)
    add_body(
        doc,
        "This chapter described the StudySync interface designs, final database schema, system architecture, and security controls. Chapter Five consolidates the design into a complete specification and presents implementation, testing, maintenance, risk, and conclusion."
    )


def chapter_five(doc):
    doc.add_page_break()
    add_heading(doc, "CHAPTER FIVE", 1)
    add_heading(doc, "SYSTEM SPECIFICATION, IMPLEMENTATION REVIEW, AND CONCLUSION", 1)

    add_heading(doc, "5.0 Introduction", 2)
    add_body(
        doc,
        "This final chapter brings together the work from Chapters One to Four. It summarises the complete StudySync specification, proposes a small phased implementation and testing approach, assesses likely risks, and explains the expected benefits to the tutoring centre."
    )

    add_heading(doc, "5.1 Complete System Specification", 2)
    add_table(
        doc,
        ["Module", "Primary Function"],
        [
            ["Authentication and User Management", "Logs users in, assigns roles, resets passwords, manages account status, and records key account actions."],
            ["Student Management", "Creates, searches, updates, and deactivates student profiles."],
            ["Subject Management", "Creates and maintains the list of subjects offered by the centre."],
            ["Academic Term Management", "Defines the term or session used when recording enrolments and assignments."],
            ["Course Registration", "Registers students for active subjects, prevents duplicates, and preserves enrolment status."],
            ["Instructor Management", "Maintains instructor profiles and teaching status."],
            ["Instructor Assignment", "Assigns instructors to subjects for a selected term and provides class lists."],
            ["Reporting", "Provides student, subject enrolment, assignment, and term summary reports."],
            ["Audit and Backup", "Logs significant system changes and protects records through scheduled backups."],
        ],
        widths=[4.5, 11.5],
    )

    add_heading(doc, "5.2 Functional Overview by Role", 2)
    add_table(
        doc,
        ["Role", "Key Functions"],
        [
            ["Student", "View own selected subjects when student access is enabled; receive registration confirmation from staff."],
            ["Registration Officer", "Register students, update profiles, search records, select subjects, and view registration confirmation."],
            ["Instructor", "View assigned subjects and the students enrolled in each assigned subject."],
            ["Centre Manager", "Manage subjects and terms, assign instructors, review reports, and supervise the registration process."],
            ["System Administrator", "Create accounts, assign roles, reset passwords, back up data, and review audit information."],
        ],
        widths=[4.0, 12.0],
    )

    add_heading(doc, "5.3 Implementation Strategy", 2)
    add_body(
        doc,
        "Although this project is primarily an analysis-and-design exercise, implementation should be introduced in short stages. This limits disruption and gives staff an opportunity to confirm that the system matches the centre's actual working practices."
    )
    add_table(
        doc,
        ["Phase", "Focus"],
        [
            ["1. Environment Setup", "Choose hosting, create the database, configure backups, and create initial administrator accounts."],
            ["2. Core Development", "Implement login, student profiles, subjects, terms, enrolments, instructor assignments, and reports."],
            ["3. Data Preparation", "Clean existing student records, agree on subject codes, and enter active instructors and current term data."],
            ["4. Pilot Use", "Allow the registration officer and manager to use the system for a small group of students and collect feedback."],
            ["5. Staff Training", "Train each role on login, relevant screens, basic security, and handling validation messages."],
            ["6. Full Deployment", "Use StudySync as the official registration record, monitor issues, and maintain regular backups."],
        ],
        widths=[4.2, 11.8],
    )

    add_heading(doc, "5.4 Testing Strategy", 2)
    add_body(
        doc,
        "Testing confirms that each module works independently and that the full workflow works from registration to reporting. Testing should use realistic sample data but not real student information during development."
    )
    add_table(
        doc,
        ["Test Type", "Purpose"],
        [
            ["Unit Testing", "Verify individual functions such as registration number validation, login, and duplicate enrolment checks."],
            ["Integration Testing", "Confirm that student records, subject selection, instructor assignments, and reports exchange data correctly."],
            ["System Testing", "Validate the complete workflow using the deployed application and database."],
            ["User Acceptance Testing", "Allow registration officers, instructors, and managers to confirm that the system meets their day-to-day needs."],
            ["Security Testing", "Check role restrictions, password handling, session expiry, and access to protected pages."],
            ["Backup and Recovery Testing", "Confirm that a database backup can be restored successfully."],
        ],
        widths=[4.0, 12.0],
    )
    add_heading(doc, "5.4.1 Sample Test Cases", 3)
    add_table(
        doc,
        ["Test Case", "Expected Result"],
        [
            ["Register a new student with valid mandatory details", "A student profile is created with a unique registration number."],
            ["Search for an existing student before new registration", "The matching profile appears and no duplicate profile is created."],
            ["Enrol a student in an available subject for an active term", "An Active enrolment is saved and appears in the student's subject list."],
            ["Attempt to enrol the same student in the same subject and term again", "The system rejects the request with a clear duplicate-enrolment message."],
            ["Assign an active instructor to a subject for a term", "The assignment is saved and appears on the instructor dashboard."],
            ["Attempt to create a second active instructor assignment for the same subject and term", "The system rejects or requires replacement of the current active assignment."],
            ["Log in with an instructor account", "The user can view only assigned subjects and enrolled students, not manager or admin screens."],
            ["Generate the subject enrolment report", "The report shows the correct total registrations by subject for the selected term."],
        ],
        widths=[8.0, 8.0],
    )

    add_heading(doc, "5.5 Risk Assessment", 2)
    add_table(
        doc,
        ["Risk", "Likelihood", "Impact", "Mitigation"],
        [
            ["Staff resistance to the new process", "Medium", "High", "Provide short role-based training, clear forms, and a pilot period before full rollout."],
            ["Incorrect data entered during migration", "Medium", "Medium", "Clean and verify paper records before entry; use required fields and review reports."],
            ["Internet or power interruption", "Medium", "Medium", "Use UPS equipment, regular backups, and a simple paper contingency form for temporary outages."],
            ["Data loss", "Low", "High", "Automated daily backups and periodic restoration tests."],
            ["Unauthorised access", "Medium", "High", "Use strong passwords, RBAC, HTTPS, session expiry, and prompt account deactivation for leavers."],
            ["Scope expansion during development", "Medium", "Medium", "Keep fees, attendance, results, and messaging out of the first release; document them as later enhancements."],
        ],
        widths=[4.3, 2.2, 2.0, 7.5],
        font_size=8.5,
    )

    add_heading(doc, "5.6 Maintenance Strategy", 2)
    for item in [
        "Corrective maintenance: fix defects and data issues found after deployment.",
        "Adaptive maintenance: keep the application compatible with new browsers, operating systems, and hosting changes.",
        "Perfective maintenance: improve forms, reports, and performance using feedback from centre staff.",
        "Preventive maintenance: review audit logs, apply security updates, test backups, and monitor database health regularly.",
    ]:
        add_bullet(doc, item)

    add_heading(doc, "5.7 Expected Benefits", 2)
    add_table(
        doc,
        ["Area", "Expected Benefit"],
        [
            ["Administrative", "Faster registration, fewer paper files, easier record retrieval, and less manual counting."],
            ["Teaching", "Instructors see their assigned subjects and student lists before classes begin."],
            ["Management", "Reliable enrolment and assignment reports support class planning and workload decisions."],
            ["Student Experience", "Students receive clearer confirmation of selected subjects and fewer registration mistakes."],
            ["Data Quality", "Central storage, validation, and duplicate checks improve accuracy and accountability."],
        ],
        widths=[4.0, 12.0],
    )

    add_heading(doc, "5.8 Future Enhancements", 2)
    for enhancement in [
        "Tuition-fee invoicing, payment tracking, and receipt generation.",
        "Attendance recording by subject and instructor.",
        "Assessment scores, progress reports, and result portals.",
        "Parent or guardian portal with controlled access to student information.",
        "Email or SMS notifications for registration, timetable changes, and payment reminders.",
        "Timetable and classroom allocation.",
        "Online lesson links and learning-resource management.",
    ]:
        add_bullet(doc, enhancement)

    add_heading(doc, "5.9 Recommendations", 2)
    for recommendation in [
        "The tutoring centre should adopt StudySync for student registration and instructor assignment before adding more complex modules.",
        "All users should receive training focused on the screens and responsibilities relevant to their roles.",
        "The centre should agree on subject codes, registration-number format, and term naming before data entry begins.",
        "Existing paper records should be reviewed for completeness before migration into the system.",
        "Daily backups should be monitored and restoration should be tested at scheduled intervals.",
        "Future enhancements should follow the modular design in this report rather than changing core records without analysis.",
    ]:
        add_bullet(doc, recommendation)

    add_heading(doc, "5.10 Conclusion", 2)
    add_body(
        doc,
        "This report has completed the analysis and design of the StudySync Student Course Registration System for a small private tutoring centre. It began by identifying weaknesses in manual registration and instructor allocation, then translated those problems into clear requirements, data models, process diagrams, interface designs, a database schema, and an implementation plan."
    )
    add_body(
        doc,
        "The feasibility study shows that StudySync can be built with common, affordable web technologies and introduced through short role-based training. Its normalised database prevents common registration errors, its role-based design protects information, and its modular architecture supports later additions without making the first version unnecessarily complex. On this basis, StudySync is recommended for development as the centre's central system for student subject registration and instructor assignment."
    )

    add_heading(doc, "REFERENCES", 1)
    for reference in [
        "Elmasri, R. and Navathe, S. B. (2016). Fundamentals of Database Systems. 7th ed. Pearson.",
        "Kendall, K. E. and Kendall, J. E. (2019). Systems Analysis and Design. 10th ed. Pearson.",
        "Pressman, R. S. and Maxim, B. R. (2020). Software Engineering: A Practitioner's Approach. 9th ed. McGraw-Hill.",
        "Sommerville, I. (2015). Software Engineering. 10th ed. Pearson.",
    ]:
        add_body(doc, reference)

    add_heading(doc, "APPENDIX", 1)
    add_heading(doc, "A. System Glossary", 2)
    add_table(
        doc,
        ["Term", "Meaning"],
        [
            ["StudySync", "The proposed Student Course Registration System for the tutoring centre."],
            ["Academic Term", "A defined period, such as First Term 2026/2027, during which registrations and assignments apply."],
            ["Enrolment", "A record showing that a student has selected one subject in one academic term."],
            ["Instructor Assignment", "A record showing that an instructor is responsible for a subject in a selected academic term."],
            ["DFD", "Data Flow Diagram; a diagram showing how data moves between external users, processes, and data stores."],
            ["ERD", "Entity-Relationship Diagram; a diagram showing database entities and their relationships."],
            ["PK / FK", "Primary Key / Foreign Key; identifiers used to uniquely identify and relate database records."],
            ["3NF", "Third Normal Form; a database design standard that removes unnecessary dependency and data duplication."],
            ["RBAC", "Role-Based Access Control; a method of limiting functions and data according to a user's role."],
            ["Audit Log", "A chronological record of important user and system activity for accountability and troubleshooting."],
        ],
        widths=[4.0, 12.0],
    )


def build_report():
    doc = Document()
    configure_document(doc)
    doc.core_properties.title = "StudySync Student Course Registration System"
    doc.core_properties.subject = "Software Analysis and Design Report"
    doc.core_properties.author = "StudySync Project Team"
    doc.core_properties.keywords = "StudySync, student course registration, software analysis and design"
    doc.core_properties.comments = "Beginner-friendly SAD report prepared for academic defence."

    add_title_page(doc)
    add_table_of_contents(doc)
    chapter_one(doc)
    chapter_two(doc)
    chapter_three(doc)
    chapter_four(doc)
    chapter_five(doc)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT_PATH)
    print(f"Created: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_report()
