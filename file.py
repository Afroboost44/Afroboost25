import os
import re

# Regex patterns
COMMENT_REGEX = r'//.*?$|/\*.*?\*/'
IMPORT_EXPORT_TYPE_REGEX = r'^\s*(import|export|type|interface)\b'
JSX_TEXT_REGEX = r'(>)(\s*[^<{]+?\s*)(<)'

def extract_string_literals_from_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove comments for processing
    content_no_comments = re.sub(COMMENT_REGEX, '', content, flags=re.DOTALL | re.MULTILINE)

    literals = []

    for i, line in enumerate(content_no_comments.splitlines(), start=1):
        if re.match(IMPORT_EXPORT_TYPE_REGEX, line):
            continue

        # Match JSX text content only
        jsx_matches = re.finditer(JSX_TEXT_REGEX, line)
        for jsx_match in jsx_matches:
            jsx_text = jsx_match.group(2).strip()
            if jsx_text and not jsx_text.startswith('{'):  # Skip if already contains expressions
                literals.append((file_path, i, jsx_text))

    return literals


def extract_from_directory(directory):
    all_literals = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                full_path = os.path.join(root, file)
                literals = extract_string_literals_from_file(full_path)
                all_literals.extend(literals)
    return all_literals


def replace_jsx_text_with_t(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # Work with the original content (don't remove comments)
    content = original_content

    # Replace text between > and < with {t('actual_text')}
    def replace_with_t(match):
        opening = match.group(1)  # >
        text = match.group(2).strip()  # the text content
        closing = match.group(3)  # <
        
        # Skip if text is empty or already contains JSX expressions
        if not text or text.startswith('{') or text.startswith('//') or text.startswith('/*'):
            return match.group(0)  # Return original match
        
        # Escape single quotes in the text
        escaped_text = text.replace("'", "\\'")
        return f"{opening}{{t('{escaped_text}')}}{closing}"

    # Only process lines that aren't import/export/type declarations
    lines = content.split('\n')
    updated_lines = []
    
    for line in lines:
        if re.match(IMPORT_EXPORT_TYPE_REGEX, line.strip()):
            updated_lines.append(line)  # Keep import/export lines unchanged
        else:
            updated_line = re.sub(JSX_TEXT_REGEX, replace_with_t, line)
            updated_lines.append(updated_line)
    
    updated_content = '\n'.join(updated_lines)

    # Write the updated content back to the file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"Processed: {file_path}")


def process_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                full_path = os.path.join(root, file)
                replace_jsx_text_with_t(full_path)


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="Process JSX files for internationalization")
    parser.add_argument("directory", help="Path to the directory to process")
    parser.add_argument("--extract", action="store_true", help="Extract string literals without modifying files")
    parser.add_argument("--replace", action="store_true", help="Replace JSX text content with t() function calls")

    args = parser.parse_args()
    
    if args.extract:
        results = extract_from_directory(args.directory)
        print("Found string literals:")
        for file_path, line_num, literal in results:
            print(f"{file_path}:{line_num}: '{literal}'")
    
    elif args.replace:
        print(f"Processing directory: {args.directory}")
        process_directory(args.directory)
        print("Replacement complete!")
    
    else:
        print("Please specify either --extract or --replace")
        parser.print_help()