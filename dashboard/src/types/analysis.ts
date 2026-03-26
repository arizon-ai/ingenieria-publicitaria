export interface GlobalKPIs {
    total_spend: number;
    total_reach: number;
    total_impressions: number;
    total_results: number;
    total_clicks: number;
    total_comments: number;
    avg_cpm: number;
    avg_cpc: number;
    avg_ctr: number;
    avg_frequency: number;
    cost_per_result: number;
    unique_campaigns: number;
    result_type_breakdown: Array<{
        type: string;
        spend: number;
        results: number;
        reach: number;
        cost_per_result: number;
        campaigns: number;
    }>;
}

export interface Campaign {
    campaign: string;
    spend: number;
    results: number;
    reach: number;
    impressions?: number;
    cost_per_result: number;
    efficiency_score: number;
    result_type: string;
    avg_ctr?: number;
    avg_cpm?: number;
}

export interface DemographicData {
    age: string;
    gender?: string;
    value?: number;
    spend?: number;
    results?: number;
    pct_spend?: number;
    pct_results?: number;
}

export interface ClusterProfile {
    cluster: number;
    count: number;
    avg_spend: number;
    avg_results: number;
    avg_efficiency: number;
    avg_ctr: number;
    avg_cpm: number;
    campaigns: string[];
}

export interface ConversationAnalysis {
    total_sessions: number;
    total_messages?: number;
    total_conversations?: number;
    has_data?: boolean;
    lead_funnel?: {
        total_sessions: number;
        funnel_steps: Array<{ step: string; count: number; pct: number }>;
        conversion_rate_complete: number;
    };
    intent_analysis: Array<{ intent: string; count: number; pct?: number }>;
    sentiment: {
        avg_polarity: number;
        distribution: { positive: number; negative: number; neutral: number };
    };
    conversion_by_length: Array<{ length: string; rate: number; total: number }>;
}

export interface CrossAnalysis {
    efficiency_benchmark: Record<string, { cost_per_result: number }>;
    full_funnel: {
        ad_spend_total: number;
        leads_captured_complete: number;
        estimated_cost_per_qualified_lead: number;
        chatbot_conversion_rate: number;
    };
}

export interface AnalysisResults {
    metadata: {
        generated_at: string;
        report_period: string;
    };
    global_kpis: GlobalKPIs;
    campaign_performance: {
        top_campaigns: Campaign[];
        most_efficient: Campaign[];
        pareto: {
            campaigns_for_80pct_spend: number;
            results_from_80pct_spend: number;
            data: Array<{
                campaign: string;
                spend: number;
                spend_cumulative_pct: number;
                results_cumulative_pct: number;
            }>;
        };
        all_campaigns: Campaign[];
    };
    demographic_analysis: {
        heatmap_spend: DemographicData[];
        best_demographics: DemographicData[];
        age_distribution: DemographicData[];
        gender_distribution: DemographicData[];
    };
    clustering_stats: {
        cluster_profiles: ClusterProfile[];
        pca_scatter: Array<{
            campaign: string;
            x: number;
            y: number;
            cluster: number;
            spend: number;
            results: number;
        }>;
    };
    conversation_analysis: ConversationAnalysis;
    cross_analysis: CrossAnalysis;
}
