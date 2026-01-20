// Template variable replacement utility
export function replaceTemplateVariables(
    template: string,
    variables: Record<string, string | undefined>
): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
        if (value !== undefined && value !== null) {
            // Replace {key} with value
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(regex, value);
        }
    }

    return result;
}

// Get template by tag
export async function getTemplateByTag(
    tag: string,
    supabaseClient: any
): Promise<{ content: string; title: string } | null> {
    const { data, error } = await supabaseClient
        .from('sms_templates')
        .select('title, content')
        .contains('tags', [tag])
        .limit(1)
        .single();

    if (error || !data) {
        console.error(`Template not found for tag: ${tag}`, error);
        return null;
    }

    return data;
}
