# app.py
import asyncio
try:
    asyncio.get_running_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

import streamlit as st
import os
import json
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
import pandas as pd
import google.generativeai as genai

from agents import ExtractionAgent, GradingAgent, RubricGenerationAgent
from grade_service import batch_grade, generate_summary
# from preprocessing_v2 import FilePreprocessor  # Your existing preprocessing module
from prompts.image_prompt import get_image_description_prompt
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env

# Configure Gemini API for legacy chat if needed
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Constants
BASE_DIR = Path(__file__).parent
RESULTS_DIR = BASE_DIR / "grading_results"
RUBRIC_FILE_PATH = BASE_DIR / "rubric.json"
RESULTS_DIR.mkdir(exist_ok=True)

# Set up Streamlit page
st.set_page_config(page_title="ScorePAL", page_icon=    "📚", layout="wide")
st.title("ScorePAL")

# Initialize session state variables if not present
for key in ['grading_complete', 'results', 'processed_files', 'question_text', 'rubric', 'submissions', 'zip_path']:
    if key not in st.session_state:
        st.session_state[key] = None
if 'chat_messages' not in st.session_state:
    st.session_state.chat_messages = {}
if 'selected_student' not in st.session_state:
    st.session_state.selected_student = None
if 'chat_with_student' not in st.session_state:
    st.session_state.chat_with_student = None
if 'exceptions' not in st.session_state:
    st.session_state.exceptions = {}

# Initialize logger (simple example)
if 'logger' not in st.session_state:
    import logging
    logger = logging.getLogger("grading_app")
    logger.setLevel(logging.INFO)
    st.session_state.logger = logger

# Initialize agents
if st.session_state.get('extraction_agent') is None:
    st.session_state.extraction_agent = ExtractionAgent(max_workers=10)
if st.session_state.get('grading_agent') is None:
    st.session_state.grading_agent = GradingAgent(max_workers=10)
if st.session_state.get('rubric_agent') is None:
    st.session_state.rubric_agent = RubricGenerationAgent(max_workers=2)

# File handler for uploads
class FileHandler:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.upload_dir = self.base_dir / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def save_file(self, uploaded_file, filename: str) -> Path:
        file_path = self.upload_dir / filename
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(uploaded_file, f)
        return file_path

    def cleanup(self):
        shutil.rmtree(self.upload_dir, ignore_errors=True)

file_handler = FileHandler(BASE_DIR)

# Helper functions for Chat feature
def _init_chat(student: str):
    st.session_state.chat_with_student = student
    if student not in st.session_state.chat_messages:
        st.session_state.chat_messages[student] = []

def _show_chat_interface():
    student = st.session_state.chat_with_student
    st.subheader(f"Chat with {student}")
    st.markdown("""
    <style>
    .chat-container {
        height: 400px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
    }
    .chat-message {
        margin-bottom: 10px;
        padding: 10px;
        border-radius: 8px;
        max-width: 70%;
    }
    .user-message {
        background-color: #d1e7dd;
        margin-left: auto;
    }
    .assistant-message {
        background-color: #f8d7da;
        margin-right: auto;
    }
    </style>
    """, unsafe_allow_html=True)
    # Display chat messages
    if student in st.session_state.chat_messages:
        for message in st.session_state.chat_messages[student]:
            role_class = "user-message" if message["role"] == "user" else "assistant-message"
            st.markdown(f'<div class="chat-message {role_class}">{message["parts"][0]}</div>', unsafe_allow_html=True)
    # Chat input
    prompt = st.chat_input("Ask about this submission...")
    if prompt:
        _handle_chat_input(prompt)

def _handle_chat_input(prompt: str):
    student = st.session_state.chat_with_student
    st.session_state.chat_messages[student].append({"role": "user", "parts": [prompt]})
    
    try:
        # Create a conversation history to provide context
        conversation_history = []
        
        # Get the last 5 messages (or all if less than 5) to provide context
        recent_messages = st.session_state.chat_messages[student][-10:]  # Increased context window
        
        # Format the conversation history for the model
        for message in recent_messages[:-1]:  # Exclude the current prompt which we just added
            conversation_history.append({
                "role": message["role"],
                "parts": message["parts"]
            })
        
        # Create a system prompt that guides the model to provide better feedback
        system_prompt = {
            "role": "system",
            "parts": [f"""You are an educational assistant helping {student}. 
            Provide clear, constructive, and personalized feedback. 
            Focus on identifying strengths and areas for improvement.
            If answering a question, be thorough but concise.
            If giving feedback on work, be specific and actionable.
            Maintain a supportive and encouraging tone throughout."""]
        }
        
        # Combine system prompt, conversation history, and current prompt
        full_prompt = [system_prompt] + conversation_history + [{
            "role": "user",
            "parts": [prompt]
        }]
        print("full_prompt:", full_prompt)
        # Generate response with conversation history for context
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(full_prompt)
        print("Response:", response)    
        # Save the response
        if response and hasattr(response, 'text') and response.text:
            st.session_state.chat_messages[student].append({"role": "assistant", "parts": [response.text]})
            # Log successful interaction for analytics
            # logging.info(f"Generated response for {student}: {len(response.text)} chars")
        else:
            # Handle empty responses
            error_message = "I couldn't generate a response. Please try rephrasing your question."
            st.session_state.chat_messages[student].append({"role": "assistant", "parts": [error_message]})
            # logging.warning(f"Empty response generated for {student}")
        
        st.rerun()
    except Exception as e:
        # Provide a helpful error message to the user
        error_message = "I'm having trouble processing your request right now. Please try again in a moment."
        st.session_state.chat_messages[student].append({"role": "assistant", "parts": [error_message]})
        # Log the error for debugging
        print(f"Chat error for {student}: {str(e)}")
        st.rerun()

# Define Tabs with sequential unlocking logic
tabs = st.tabs(["Upload", "Answer Key", "Generate Rubric", "Grade Assignments", "Chat Dashboard", "Pipeline Logs", "Exceptions"])
# Upload Tab – Always accessible
with tabs[0]:
    st.header("Step 1: Upload Files")
    submissions_zip = st.file_uploader("Upload Submissions (ZIP of PDF/TXT files)", type="zip")
    question_paper_file = st.file_uploader("Upload Question Paper (PDF or TXT)", type=["pdf", "txt"])
    answer_key = st.file_uploader("Upload Answer Key (Optional, TXT)", type="txt")
    if st.button("Upload Files"):
        if not submissions_zip or not question_paper_file:
            st.error("Please upload both a submissions ZIP and a question paper.")
        else:
            zip_path = file_handler.save_file(submissions_zip, "submissions.zip")
            st.session_state.zip_path = str(zip_path)
            
            # Updated: Use Mistral OCR to extract text from the PDF question paper
            if question_paper_file.type == "text/plain":
                question_text = question_paper_file.read().decode("utf-8")
            else:
                # Save the PDF file to disk
                question_pdf_path = file_handler.save_file(question_paper_file, "question_paper.pdf")
                # Use the extract_pdf_text function (which uses Mistral OCR if configured)
                from extraction_service import _extract_text_from_pdf
                question_text = _extract_text_from_pdf(str(question_pdf_path))
            st.session_state.question_text = question_text

            if answer_key:
                answer_path = file_handler.save_file(answer_key, "answer.txt")
                st.session_state.answer_key = str(answer_path)
            else:
                st.session_state.answer_key = None
            st.success("Files uploaded successfully!")


from grade_service import HF_MISTRAL_URL, HEADERS_MISTRAL
import requests, re
with tabs[1]:
    st.header("Step 1.5: Auto‑Generate Answer Key")

    if not st.session_state.question_text:
        st.info("Complete Step 1 first.")
    else:
        # Ensure answer_key exists and is a dict
        if st.session_state.get("answer_key") is None:
            st.session_state.answer_key = {}
        answer_key = st.session_state.answer_key

        # Auto‑generate only if empty
        if not answer_key:
            questions = re.split(r"\n(?=\d+[.)])", st.session_state.question_text.strip())
            for idx, q in enumerate(questions, start=1):
                payload = {
                    "messages": [
                        {"role": "system", "content": "Provide a concise, correct answer only."},
                        {"role": "user", "content": q.strip()},
                    ],
                    "max_new_tokens": 128,
                    "temperature": 0.0,
                }
                resp = requests.post(HF_MISTRAL_URL, headers=HEADERS_MISTRAL, json=payload)
                try:
                    answer = resp.json()["choices"][0]["message"]["content"].strip()
                except Exception:
                    answer = ""
                st.session_state.answer_key[idx] = answer
            st.success("Answer key generated automatically!")

        # Display editable answer fields
        for idx, ans in st.session_state.answer_key.items():
            st.text_area(f"Answer for Question {idx}", value=ans, key=f"ans_{idx}", height=100)

        if st.button("Save Answer Key"):
            st.success("Answer key saved to session state!")


with tabs[2]:
    if not st.session_state.question_text:
        st.info("Please complete the Upload step first.")
    else:
        st.header("Step 2: Generate Grading Rubric")
        rubric_prompt = st.text_area("Rubric Generation Prompt", "Generate a rubric that evaluates reasoning, MCQs, and test-case based evaluation.")
        if st.button("Generate Rubric"):
            future = st.session_state.rubric_agent.generate_rubric(st.session_state.question_text, rubric_prompt)
            print(future.running())
            rubric = future.result()
            # print(rubric)
            st.session_state.rubric = rubric
            with open(RUBRIC_FILE_PATH, 'w') as f:
                json.dump(rubric, f, indent=2)
            st.write("Generated Rubric:")
            st.json(rubric)
def save_summary(summary: dict, output_dir: str = "grading_results", filename: str = "results.json") -> str:
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    return filepath
# Grade Assignments Tab – Accessible only after Rubric is generated
with tabs[3]:
    if not st.session_state.rubric:
        st.info("Please complete the Rubric Generation step first.")
    else:
        st.header("Step 3: Grade Assignments")
        strictness = st.slider("Select Grading Strictness", 1, 10, 5)
        if st.button("Start Grading"):
            if not st.session_state.zip_path or not st.session_state.question_text:
                st.error("Missing files or question paper.")
            else:
                st.info("Extracting submissions...")
                extraction_future = st.session_state.extraction_agent.extract(st.session_state.zip_path)
                submissions = extraction_future.result()
                st.session_state.submissions = submissions
                st.info("Grading submissions...")
                # from grade_service import batch_grade
                # grades = batch_grade(submissions, st.session_state.question_text, st.session_state.rubric)
                # st.session_state.results = grades
                # st.session_state.grading_complete = True
                # summary = generate_summary(grades)
                # st.session_state.summary = summary
                # save_summary(summary, output_dir=RESULTS_DIR, filename="results.json")
                # st.success("Grading completed!")
                # st.info(f"submissions:::::::::::::::::::::::::::::::::::::::::{submissions}")
                grading_futures = st.session_state.grading_agent.grade(submissions, st.session_state.question_text, st.session_state.answer_key, st.session_state.rubric)
                grades = {}
                for student, future in grading_futures.items():
                    grades[student] = future.result()
                st.session_state.results = grades
                st.session_state.grading_complete = True
                summary = generate_summary(grades)
                st.session_state.summary = summary
                save_summary(summary, output_dir=RESULTS_DIR, filename="results.json")
                st.success("Grading completed!")
# # Chat Dashboard Tab – Accessible only after grading is complete
# with tabs[3]:
#     if not st.session_state.grading_complete:
#         st.info("Please complete the Grading step first.")
#     else:
#         st.header("Step 4: Chat Dashboard")
#         st.subheader("Student Grades")
#         st.table(pd.DataFrame(st.session_state.results).T)
#         st.subheader("Select a Student to Chat")
#         for student in st.session_state.results.keys():
#             if st.button(f"Chat with {student}", key=f"chat_{student}"):
#                 _init_chat(student)
#         if st.session_state.chat_with_student:
#             _show_chat_interface()

# In your Dashboard Tab code (e.g., inside with tabs[3]:)
with tabs[4]:
    if not st.session_state.grading_complete:
        st.info("Please complete the Grading step first.")
    else:
        st.header("Step 4: Chat Dashboard")
        
        # For each student, create an expander to display their score, feedback, and mistakes
        for student, result in st.session_state.results.items():
            with st.expander(f"{student} — {result['score']}/{result['total']} points"):
                
                # Display overall grading feedback
                st.markdown(f"**Grading Feedback:** {result.get('grading_feedback', 'No feedback available.')}")
                
                # Parse and display mistakes (if any)
                mistakes = result.get("mistakes", {})
                if mistakes:
                    st.subheader("Mistakes & Deductions")
                    # Build a list of dictionaries to show each mistake in a table
                    mistakes_list = []
                    for section_name, detail in mistakes.items():
                        if isinstance(detail, dict):
                            mistakes_list.append({
                                "Section": section_name,
                                "Deductions": detail.get("deductions", 0),
                                "Reason": detail.get("reasons", "N/A"),
                            })
                    st.table(pd.DataFrame(mistakes_list))
                else:
                    st.info("No mistakes recorded for this student.")
                
                # Provide a chat button for each student
                if st.button(f"Chat with {student}", key=f"chat_{student}"):
                    _init_chat(student)
        
        # If a chat is active, show the chat interface below
        if st.session_state.chat_with_student:
            _show_chat_interface()

# Pipeline Logs Tab – For visibility on logs
with tabs[5]:
    st.header("Step 4: Manage Student Exceptions")
    st.write("Add an exception for a student who should be handled separately (excused, etc.).")

    # Form to add an exception
    with st.form("add_exception_form"):
        student_name = st.text_input("Student Name")
        exception_reason = st.text_area("Exception Reason")
        submitted = st.form_submit_button("Add Exception")
        if submitted:
            if not student_name.strip() or not exception_reason.strip():
                st.error("Please provide both student name and exception reason.")
            else:
                st.session_state.exceptions[student_name] = {
                    "reason": exception_reason,
                    "timestamp": datetime.now().isoformat()
                }
                st.success(f"Exception added for {student_name}")

    # Display the exceptions added so far
    if st.session_state.exceptions:
        st.subheader("Exceptions Added Till Date")
        exceptions_list = [
            {"Student": student, "Exception Reason": details["reason"], "Timestamp": details["timestamp"]}
            for student, details in st.session_state.exceptions.items()
        ]
        exceptions_df = pd.DataFrame(exceptions_list)
        st.table(exceptions_df)
    else:
        st.info("No exceptions have been added yet.")

# Optional Cleanup Button
if st.button("Cleanup Temporary Files"):
    file_handler.cleanup()
    st.success("Temporary files cleaned up!")
