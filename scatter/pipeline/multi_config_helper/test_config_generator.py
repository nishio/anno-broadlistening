from multi_config_helper import generate_configs

def main():
    survey_definitions = [
        {
            "name": "日本の未来",
            "input": "dummy-comments-japan",
            "question": "日本の未来に対して、あなたの意見を教えてください。",
            "model": "gpt-3.5-turbo",
            "extraction": {
                "workers": 3,
                "limit": 20,
                "properties": ["source", "age"],
                "categories": {
                    "genre": {
                        "politics": "政治に関する意見",
                        "economy": "経済に関する意見"
                    }
                }
            }
        }
    ]

    generate_configs("test", survey_definitions)

if __name__ == "__main__":
    main()
