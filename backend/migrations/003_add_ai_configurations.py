"""
Migration 003: Add AI Configuration Tables
Adds tables for storing user AI provider configurations
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import enum

class AIProvider(enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    HUGGINGFACE = "huggingface"
    PERPLEXITY = "perplexity"
    COHERE = "cohere"
    REPLICATE = "replicate"
    TOGETHER = "together"
    GROQ = "groq"
    MISTRAL = "mistral"
    PALM = "palm"
    AZURE_OPENAI = "azure_openai"

def upgrade():
    """Add AI configuration tables"""
    
    # Create AI provider enum type
    ai_provider_enum = postgresql.ENUM(AIProvider)
    ai_provider_enum.create(op.get_bind())
    
    # Create ai_provider_templates table
    op.create_table(
        'ai_provider_templates',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('provider', ai_provider_enum, nullable=False),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('default_endpoint', sa.String(500), nullable=True),
        sa.Column('default_max_tokens', sa.Integer, default=2048),
        sa.Column('default_temperature', sa.String(10), default='0.7'),
        sa.Column('default_top_p', sa.String(10), default='0.9'),
        sa.Column('capabilities', sa.JSON, nullable=True),
        sa.Column('cost_per_1k_tokens', sa.String(20), nullable=True),
        sa.Column('max_context_length', sa.Integer, nullable=True),
        sa.Column('supports_streaming', sa.Boolean, default=False),
        sa.Column('supports_function_calling', sa.Boolean, default=False),
        sa.Column('recommended_for', sa.JSON, nullable=True),
        sa.Column('performance_tier', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create ai_model_configs table
    op.create_table(
        'ai_model_configs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('user.id'), nullable=False),
        sa.Column('provider', ai_provider_enum, nullable=False),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('api_key', sa.Text, nullable=False),  # Will be encrypted
        sa.Column('api_endpoint', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('is_default', sa.Boolean, default=False, nullable=False),
        sa.Column('max_tokens', sa.Integer, default=2048),
        sa.Column('temperature', sa.String(10), default='0.7'),
        sa.Column('top_p', sa.String(10), default='0.9'),
        sa.Column('frequency_penalty', sa.String(10), default='0.0'),
        sa.Column('presence_penalty', sa.String(10), default='0.0'),
        sa.Column('extra_config', sa.JSON, nullable=True),
        sa.Column('capabilities', sa.JSON, nullable=True),
        sa.Column('cost_per_1k_tokens', sa.String(20), nullable=True),
        sa.Column('max_context_length', sa.Integer, nullable=True),
        sa.Column('total_requests', sa.Integer, default=0),
        sa.Column('total_tokens_used', sa.Integer, default=0),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Add indexes
    op.create_index('ix_ai_model_configs_user_id', 'ai_model_configs', ['user_id'])
    op.create_index('ix_ai_model_configs_provider', 'ai_model_configs', ['provider'])
    op.create_index('ix_ai_model_configs_is_default', 'ai_model_configs', ['is_default'])
    op.create_index('ix_ai_provider_templates_provider', 'ai_provider_templates', ['provider'])
    
    # Add columns to user table for AI preferences
    op.add_column('user', sa.Column('default_ai_config_id', sa.Integer, nullable=True))
    op.add_column('user', sa.Column('grading_preferences', sa.Text, nullable=True))
    
    # Insert default provider templates
    provider_templates = [
        # OpenAI Models
        {
            'provider': 'openai',
            'model_name': 'gpt-4',
            'display_name': 'GPT-4',
            'description': 'Most capable GPT-4 model, great for complex grading tasks',
            'default_endpoint': 'https://api.openai.com/v1',
            'default_max_tokens': 2048,
            'capabilities': ['text_generation', 'code_analysis', 'math_reasoning', 'high_accuracy'],
            'cost_per_1k_tokens': '0.03',
            'max_context_length': 8192,
            'supports_streaming': True,
            'supports_function_calling': True,
            'recommended_for': ['complex_grading', 'code_analysis', 'detailed_feedback'],
            'performance_tier': 'premium'
        },
        {
            'provider': 'openai',
            'model_name': 'gpt-4-turbo',
            'display_name': 'GPT-4 Turbo',
            'description': 'Latest GPT-4 model with larger context and lower cost',
            'default_endpoint': 'https://api.openai.com/v1',
            'default_max_tokens': 4096,
            'capabilities': ['text_generation', 'code_analysis', 'math_reasoning', 'long_context'],
            'cost_per_1k_tokens': '0.01',
            'max_context_length': 128000,
            'supports_streaming': True,
            'supports_function_calling': True,
            'recommended_for': ['batch_grading', 'long_submissions', 'detailed_analysis'],
            'performance_tier': 'premium'
        },
        {
            'provider': 'openai',
            'model_name': 'gpt-3.5-turbo',
            'display_name': 'GPT-3.5 Turbo',
            'description': 'Fast and cost-effective model for basic grading tasks',
            'default_endpoint': 'https://api.openai.com/v1',
            'default_max_tokens': 2048,
            'capabilities': ['text_generation', 'fast_response'],
            'cost_per_1k_tokens': '0.001',
            'max_context_length': 16385,
            'supports_streaming': True,
            'supports_function_calling': True,
            'recommended_for': ['quick_grading', 'basic_feedback', 'batch_processing'],
            'performance_tier': 'balanced'
        },
        
        # Anthropic Models
        {
            'provider': 'anthropic',
            'model_name': 'claude-3-opus-20240229',
            'display_name': 'Claude 3 Opus',
            'description': 'Most powerful Claude model for complex reasoning and analysis',
            'default_endpoint': 'https://api.anthropic.com',
            'default_max_tokens': 4096,
            'capabilities': ['text_generation', 'technical_writing', 'creative_writing', 'long_context', 'high_accuracy'],
            'cost_per_1k_tokens': '0.015',
            'max_context_length': 200000,
            'supports_streaming': True,
            'recommended_for': ['essay_grading', 'technical_analysis', 'detailed_feedback'],
            'performance_tier': 'premium'
        },
        {
            'provider': 'anthropic',
            'model_name': 'claude-3-sonnet-20240229',
            'display_name': 'Claude 3 Sonnet',
            'description': 'Balanced Claude model for general-purpose grading',
            'default_endpoint': 'https://api.anthropic.com',
            'default_max_tokens': 2048,
            'capabilities': ['text_generation', 'technical_writing', 'long_context'],
            'cost_per_1k_tokens': '0.003',
            'max_context_length': 200000,
            'supports_streaming': True,
            'recommended_for': ['general_grading', 'writing_assessment', 'balanced_feedback'],
            'performance_tier': 'balanced'
        },
        
        # Google Models
        {
            'provider': 'google',
            'model_name': 'gemini-2.0-flash',
            'display_name': 'Gemini 2.0 Flash',
            'description': 'Latest fast Gemini model with excellent performance',
            'default_max_tokens': 8192,
            'capabilities': ['text_generation', 'image_analysis', 'fast_response', 'long_context'],
            'cost_per_1k_tokens': '0.000075',
            'max_context_length': 1000000,
            'recommended_for': ['fast_grading', 'multimodal_analysis', 'batch_processing'],
            'performance_tier': 'fast'
        },
        {
            'provider': 'google',
            'model_name': 'gemini-1.5-pro',
            'display_name': 'Gemini 1.5 Pro',
            'description': 'Professional Gemini model with massive context window',
            'default_max_tokens': 8192,
            'capabilities': ['text_generation', 'image_analysis', 'long_context', 'high_accuracy'],
            'cost_per_1k_tokens': '0.0035',
            'max_context_length': 2000000,
            'recommended_for': ['complex_grading', 'long_documents', 'comprehensive_analysis'],
            'performance_tier': 'premium'
        },
        
        # Perplexity Models
        {
            'provider': 'perplexity',
            'model_name': 'llama-3.1-sonar-large-128k-online',
            'display_name': 'Llama 3.1 Sonar Large',
            'description': 'Large Perplexity model with online search capabilities',
            'default_endpoint': 'https://api.perplexity.ai/chat/completions',
            'default_max_tokens': 2048,
            'capabilities': ['text_generation', 'fast_response', 'creative_writing'],
            'cost_per_1k_tokens': '0.001',
            'max_context_length': 131072,
            'recommended_for': ['research_grading', 'fact_checking', 'current_events'],
            'performance_tier': 'balanced'
        }
    ]
    
    # Insert provider templates
    ai_provider_templates = op.get_bind().execute(
        sa.text("SELECT name FROM information_schema.tables WHERE table_name = 'ai_provider_templates'")
    ).fetchone()
    
    if ai_provider_templates:
        for template in provider_templates:
            op.execute(
                sa.text("""
                    INSERT INTO ai_provider_templates 
                    (provider, model_name, display_name, description, default_endpoint, 
                     default_max_tokens, capabilities, cost_per_1k_tokens, max_context_length,
                     supports_streaming, supports_function_calling, recommended_for, performance_tier)
                    VALUES 
                    (:provider, :model_name, :display_name, :description, :default_endpoint,
                     :default_max_tokens, :capabilities, :cost_per_1k_tokens, :max_context_length,
                     :supports_streaming, :supports_function_calling, :recommended_for, :performance_tier)
                """),
                **{
                    **template,
                    'capabilities': str(template['capabilities']).replace("'", '"'),
                    'recommended_for': str(template['recommended_for']).replace("'", '"'),
                    'supports_streaming': template.get('supports_streaming', False),
                    'supports_function_calling': template.get('supports_function_calling', False)
                }
            )

def downgrade():
    """Remove AI configuration tables"""
    
    # Remove added columns from user table
    op.drop_column('user', 'grading_preferences')
    op.drop_column('user', 'default_ai_config_id')
    
    # Drop indexes
    op.drop_index('ix_ai_provider_templates_provider')
    op.drop_index('ix_ai_model_configs_is_default')
    op.drop_index('ix_ai_model_configs_provider')
    op.drop_index('ix_ai_model_configs_user_id')
    
    # Drop tables
    op.drop_table('ai_model_configs')
    op.drop_table('ai_provider_templates')
    
    # Drop enum type
    ai_provider_enum = postgresql.ENUM(AIProvider)
    ai_provider_enum.drop(op.get_bind()) 