#app_v2.py
import sys

import streamlit as st
import os
import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from grading_v2 import GradingService
from preprocessing_v2 import FilePreprocessor
from utils.logging_utils import setup_logging, StreamlitHandler
import google.generativeai as genai
from prompts.image_prompt import get_image_description_prompt
from dotenv import load_dotenv
import pandas as pd

load_dotenv()  # Load environment variables from .env file
print(f"Python version: {sys.version}")

# Set Tesseract path
# os.environ["TESSDATA_PREFIX"] = "C:\\Users\\mohan\\Downloads\\Personal Project\\Prod\\GA\\Tesseract-OCR\\tessdata"
# os.environ["POPPLER_PATH"] = "C:\\Users\\mohan\\Downloads\\Personal Project\\Prod\\GA\\poppler\\poppler-24.07.0\\Library\\bin"

# os.environ["TESSDATA_PREFIX"] = os.getenv("TESSDATA_PREFIX")
# os.environ["POPPLER_PATH"] = os.getenv("POPPLER_PATH")
# Set Tesseract paths with fallbacks
# Configure Tesseract OCR path
os.environ["TESSDATA_PREFIX"] = os.getenv("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/4.00/tessdata")
tesseract_path = os.getenv("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/4.00/tessdata")
os.environ["PATH"] = f"{tesseract_path}:{os.environ['PATH']}"


poppler_path = os.getenv("POPPLER_PATH", "/app/poppler/poppler-24.07.0/Library/bin")
os.environ["PATH"] = f"{poppler_path}:{os.environ['PATH']}"


# os.environ["TESSDATA_PREFIX"] = "/usr/share/tesseract-ocr/4.00/tessdata"
# os.environ["POPPLER_PATH"] = "/usr/bin"
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "grading_results")
RUBRIC_FILE_PATH = os.path.join(BASE_DIR, "rubric.json")
os.makedirs(RESULTS_DIR, exist_ok=True)

# UI Configuration
st.set_page_config(page_title="Assignment Grading Assistant", page_icon="📚")

# Initialize Session State
if 'grading_complete' not in st.session_state:
    st.session_state.grading_complete = False
if 'results' not in st.session_state:
    st.session_state.results = None
if 'logs' not in st.session_state:
    st.session_state.logs = []

# Setup Logging
logger = setup_logging()
streamlit_handler = StreamlitHandler(st.session_state.logs)
logger.addHandler(streamlit_handler)

class FileHandler:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.temp_dir = self.base_dir / "data" / "uploads"
        self.temp_dir_path = self.base_dir / "data" / "temp_uploads"
        self.temp_metadata = self.base_dir / "data" / "processed_uploads" / "metadata"
        self.extracted_images_path = self.base_dir / "data" / "extracted_images"
    def setup(self):
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
    def save_file(self, uploaded_file, filename: str) -> Path:
        if not uploaded_file:
            return None
        file_path = self.temp_dir / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, 'wb') as f:
            shutil.copyfileobj(uploaded_file, f)
        return file_path
    
    def cleanup(self):
        if self.temp_dir_path.exists():
            shutil.rmtree(self.temp_dir_path)
        if self.temp_metadata.exists():
            shutil.rmtree(self.temp_metadata)
def display_results(results: dict, processed_files: dict):
    """Display grading results using full screen width with split layout"""
    
    # Remove default padding and set full width
    st.markdown("""
        <style>
        .block-container {
            max-width: 100% !important;
            padding-top: 10rem;
            padding-right: 10rem;
            padding-left: 10rem;
            padding-bottom: 10rem;
        }
        .element-container {
            width: 100% !important;
        }
        .stMarkdown {
            width: 100% !important;
        }
        .metric-container { 
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .st-emotion-cache-1r6slb0 {
            padding: 0px !important;
        }
        .row-widget.stButton {width: 100%;}
        </style>
    """, unsafe_allow_html=True)

    if not results or "student_results" not in results:
        st.warning("No results to display")
        return

    # Initialize session states
    if 'selected_student' not in st.session_state:
        st.session_state.selected_student = None
    if 'chat_with_student' not in st.session_state:
        st.session_state.chat_with_student = None
    if 'chat_messages' not in st.session_state:
        st.session_state.chat_messages = {}

    # Create main layout with full width - use container for better control
    with st.container():
        left_col, right_col = st.columns([1, 1])

        with left_col:
            st.header("Grading Results")
            
            # Summary metrics
            met_col1, met_col2, met_col3, met_col4 = st.columns(4)
            with met_col1:
                st.metric("Submissions", results["summary_stats"]["submission_count"])
            with met_col2:
                st.metric("Average", f"{round(results['summary_stats']['average_score']*100,2)}%")
            with met_col3:
                passing_rate = (results["summary_stats"]["passing_count"]/results["summary_stats"]["submission_count"]*100)
                st.metric("Pass Rate", f"{passing_rate:.1f}%")
            with met_col4:
                total_earned = sum(r['score'] for r in results['student_results'].values())
                total_possible = sum(r['total'] for r in results['student_results'].values())
                st.metric("Total Score", f"{total_earned:.1f}/{total_possible:.1f}")
            st.markdown("### Student Grades")       
            
            # Create header
            header_cols = st.columns([5, 2, 1, 1])  # Adjusted column widths
            header_cols[0].markdown("**Student Name**")
            header_cols[1].markdown("**Score**")
            header_cols[2].markdown("**View**")
            header_cols[3].markdown("**Chat**")

            # Create rows
            for student, result in results["student_results"].items():
                row_cols = st.columns([5, 2, 1, 1])  # Match header structure
                
                with row_cols[0]:
                    st.write(student)
                    
                with row_cols[1]:
                    st.write(f"{result['score']:.1f}/{result['total']}")
                    
                with row_cols[2]:
                    st.button("👀", 
                            key=f"view_{student}",
                            on_click=lambda s=student: setattr(st.session_state, 'selected_student', s))
                
                with row_cols[3]:
                    st.button("💬", 
                            key=f"chat_{student}", 
                            on_click=lambda s=student: _init_chat(s))
        with right_col:
            tab1, tab2 = st.tabs(["📋 Details", "💭 Chat"])
            
            with tab1:
                if st.session_state.selected_student:
                    _show_student_details(results, st.session_state.selected_student)
            
            with tab2:
                if st.session_state.chat_with_student:
                    _show_chat_interface(results, processed_files)

def _init_chat(student):
    """Initialize chat for a student"""
    st.session_state.chat_with_student = student
    if student not in st.session_state.chat_messages:
        st.session_state.chat_messages[student] = []

def _show_student_details(results, student):
    """Display student details"""
    student_data = results["student_results"][student]
    st.subheader(f"Details for {student}")
    
    if student_data.get('mistakes'):
        st.markdown("#### Deductions")
        deduction_rows = []
        total_deductions = 0
        for section, detail in student_data['mistakes'].items():
            deduction = detail['deductions']
            total_deductions += deduction
            deduction_rows.append({
                "Section": section,
                "Points Lost": f"-{deduction:.1f}",
                "Reason": detail['reasons']
            })
        
        st.markdown(f"**Total Points Deducted**: {total_deductions:.1f}")
        st.dataframe(
            pd.DataFrame(deduction_rows),
            hide_index=True,
            use_container_width=True
        )

def _show_chat_interface(results, processed_files):  # Added second parameter
    """Display chat interface"""
    st.subheader(f"Chat - {st.session_state.chat_with_student}")
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
            margin-left: auto; /* Align user messages to the right */
        }
        .assistant-message {
            background-color: #f8d7da;
            margin-right: auto; /* Align assistant messages to the left */
        }
        </style>
    """, unsafe_allow_html=True)
    # Chat messages
    # st.markdown('<div class="chat-container">', unsafe_allow_html=True)
    # for message in st.session_state.chat_messages[st.session_state.chat_with_student]:
    #     print(message)
    #     with st.chat_message(message["role"]):
    #         st.write(message["content"] if "content" in message else message["parts"][0])
    for message in st.session_state.chat_messages[st.session_state.chat_with_student]:
        role_class = "user-message" if message["role"] == "user" else "assistant-message"
        st.markdown(
            f'<div class="chat-message {role_class}">{message["parts"][0]}</div>',
            unsafe_allow_html=True
        )
    # Chat input - pass both parameters
    if prompt := st.chat_input("Ask about this submission..."):
        _handle_chat_input(prompt, results, processed_files)  # Added processed_files

    st.markdown("""
        <script>
        setTimeout(() => {
            var chatContainer = window.parent.document.querySelector('.chat-container');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 100);
        </script>
    """, unsafe_allow_html=True)
    # st.markdown('</div>', unsafe_allow_html=True)


def _handle_chat_input(prompt, results, processed_files):
    """Process chat input with proper Gemini message formatting"""
    student = st.session_state.chat_with_student
    st.session_state.chat_messages[student].append(
        {"role": "user", "parts": [prompt]}
    )

    try:
        student_data = results["student_results"][student]
        
        # Build history in Gemini-compatible format
        history = []
        for msg in st.session_state.chat_messages[student]:
            history.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [msg["content"] if "content" in msg else msg["parts"][0]]
            })

        # Proper Gemini message structure
        messages = [
            *history,
            {
                "role": "user",
                "parts": [f"""
                Submission Context:
                - Student: {student}
                - Score: {student_data['score']}/{student_data['total']}
                - Feedback: {student_data['grading_feedback']}
                - Deductions: {json.dumps(student_data.get('mistakes', {}), indent=2)}
                
                Current Query: {prompt}
                """]
            }
        ]

        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(messages)
        
        st.session_state.chat_messages[student].append({
            "role": "model",
            "parts": [response.text]
        })
        st.rerun()

    except Exception as e:
        st.error(f"Error generating response: {str(e)}")
        logger.error(f"Chat error: {str(e)}")

def main():
    st.title("Assignment Grading Assistant")
    st.write("Upload student submissions and grading materials to begin grading.")
    

    
    # File Upload Form
    with st.form("upload_form"):
        col1, col2 = st.columns(2)
        with col1:
            submissions_zip = st.file_uploader(
                "Upload Submissions (ZIP)", 
                type="zip",
                help="ZIP file containing student submissions"
            )
            question_paper = st.file_uploader(
                "Upload Question Paper (PDF)", 
                type="pdf"
            )
        with col2:
            answer_key = st.file_uploader(
                "Upload Answer Key (Optional)", 
                type="txt"
            )
            strictness = st.slider(
                "Grading Strictness", 
                min_value=1, 
                max_value=5, 
                value=1
            )
        rubric_option = st.radio(
            "Rubric Option",
            ("Upload Rubric Text", "Upload Rubric JSON")
        )
        rubric_file = st.file_uploader(
            "Upload Rubric",
            type=["txt", "json"]
        )
        submit = st.form_submit_button("Start Grading")

    if submit:
        if not submissions_zip or not question_paper:
            st.error("Please upload required files")
            return

        file_handler = FileHandler(BASE_DIR)
        try:
            with st.spinner("Processing submissions and grading..."):
                # Setup and save files
                file_handler.setup()
                submissions_path = file_handler.save_file(submissions_zip, "submissions.zip")
                question_path = file_handler.save_file(question_paper, "question.pdf")
                answer_path = file_handler.save_file(answer_key, "answer.txt") if answer_key else None
                
                api_key = os.getenv("GEMINI_API_KEY")
                
                if not api_key:
                    logger.error("No API_KEY found. Please set the GEMINI_API_KEY environment variable.")
                    raise ValueError("No API_KEY found. Please set the GEMINI_API_KEY environment variable.")
                print(api_key,"api_key")
                
                grading_service = GradingService(api_key=api_key)
                # Process rubric
                rubric = None
                if rubric_file:
                    rubric_path = file_handler.save_file(rubric_file, "rubric.txt" if rubric_option == "Upload Rubric Text" else "rubric.json")
                    if rubric_option == "Upload Rubric Text":
                        with open(rubric_path, 'r', encoding="utf-8", errors="replace") as f:
                            rubric_text = f.read()
                        rubric = grading_service.get_rubric_from_text(rubric_text)
                    else:
                        with open(rubric_path, 'r') as f:
                            rubric = json.load(f)
                
                # Save rubric to rubric.json
                with open(RUBRIC_FILE_PATH, 'w') as f:
                    json.dump(rubric, f, indent=2)
                logger.info(f"Rubric saved to {RUBRIC_FILE_PATH}")

                # Process files
                preprocessor = FilePreprocessor()
                # logger.info("Processing files: %s, %s, %s", str(submissions_path), str(question_path), str(answer_path))
                processed_files = preprocessor.process_files(
                    str(submissions_path),
                    str(question_path),
                    str(answer_path) if answer_path else None,
                    rubric
                )
                # logger.info(f"Files processed successfully,{processed_files['answer_key']}")
                # logger.info(f"Processed files: {processed_files['submissions']}")
                # logger.info(processed_files)
                
                
                # logger.info("Grading submissions with rubric: %s", rubric["total_points"])
                results = grading_service.batch_grade(
                    processed_files["submissions"],
                    processed_files["question"],
                    processed_files["answer_key"],
                    rubric
                )
                # logger.info("Grading completed successfully with results: %s", results)
                # logger.info(f"Results: {results}")
                st.session_state.processed_files = processed_files

                # Generate summary
                summary = grading_service.generate_summary(results)
                # print("summary:::::::::::::",summary)
                # logger.info(f"Grading summary: {summary}")
                # Save summary and results to file
                result_path = Path(RESULTS_DIR) / "grading_results.json"
                with open(result_path, 'w') as f:
                    json.dump(summary, f, indent=2)
                logger.info(f"Results saved to {result_path}")

                # Store results
                if results:
                    st.session_state.results = summary
                    st.session_state.grading_complete = True
                    
                    st.success("Grading completed successfully!")

        except Exception as e:
            logger.error(f"Error during grading: {str(e)}")
            st.error(f"An error occurred: {str(e)}")
        finally:
            file_handler.cleanup()
            pass

    # Display Results if Available
    if st.session_state.grading_complete and st.session_state.results:
        display_results(st.session_state.results, st.session_state.processed_files)
        
        # Download Results Button
        if st.download_button(
            "Download Results (JSON)",
            data=json.dumps(st.session_state.results, indent=2),
            file_name=f"grading_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        ):
            st.success("Results downloaded successfully!")

if __name__ == "__main__":
    main()