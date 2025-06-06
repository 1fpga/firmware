//! The goal of this module is to load the configuration from an INI file, then
//! convert it to a JSON file. This way we can use serde_json which is a better
//! supported library to deserialize stuff.
//!
//! MiSTer.ini differs from the standard INI format as:
//!   1. it allows "root" key-value pairs before any section.
//!   2. it allows multiple sections with the same name.
//!   3. it allows multiple keys with the same name in a section.
//!   4. it allows empty lines/sections containing comments.
//!   5. it allows category names on multiple lines.
use std::collections::BTreeMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("INI parse error: {0}")]
    ParseError(String),
}

#[derive(Debug, Copy, Clone)]
pub struct KeyValue<'a> {
    pub key: &'a str,
    pub value: &'a str,
}

#[derive(Default, Debug, Clone)]
pub struct Section<'a> {
    entries: Vec<KeyValue<'a>>,
}

impl<'a> Section<'a> {
    pub fn new() -> Self {
        Section {
            entries: Vec::new(),
        }
    }

    /// Get all entries as a sequence of merged key-values into a vector (which can contain
    /// a single value).
    pub fn entries_seq(&self) -> BTreeMap<&'a str, Vec<&'a str>> {
        self.entries.iter().fold(BTreeMap::new(), |mut map, entry| {
            map.entry(entry.key).or_default().push(entry.value);
            map
        })
    }

    pub fn push(&mut self, key: &'a str, value: &'a str) {
        self.entries.push(KeyValue { key, value });
    }
}

impl<'a> From<Section<'a>> for BTreeMap<&'a str, &'a str> {
    fn from(value: Section<'a>) -> Self {
        let mut map = BTreeMap::new();
        for entry in value.entries {
            map.insert(entry.key, entry.value);
        }
        map
    }
}

impl<'a> From<Section<'a>> for BTreeMap<&'a str, Vec<&'a str>> {
    fn from(value: Section<'a>) -> Self {
        let mut map = BTreeMap::new();
        for entry in value.entries {
            map.entry(entry.key)
                .or_insert_with(Vec::new)
                .push(entry.value);
        }
        map
    }
}

#[derive(Default, Debug, Clone)]
pub struct Ini<'a> {
    root: Section<'a>,
    sections: Vec<(&'a str, Section<'a>)>,
}

impl<'a> Ini<'a> {
    /// Returns all sections (excluding the root).
    pub fn sections(&self) -> impl Iterator<Item = (&'a str, &Section<'a>)> {
        self.sections.iter().map(|(name, section)| (*name, section))
    }

    pub fn to_json_string(
        &self,
        tx: impl Fn(&str, &str) -> Option<String>,
        is_seq: impl Fn(&str) -> bool,
        aliases: impl Fn(&str) -> Option<&str>,
    ) -> String {
        fn output_section(
            section: &Section,
            tx: &impl Fn(&str, &str) -> Option<String>,
            is_seq: &impl Fn(&str) -> bool,
            aliases: impl Fn(&str) -> Option<&str>,
        ) -> String {
            let mut json = String::with_capacity(1024);
            let entries = section.entries_seq();

            // Merge aliases.
            let entries = entries
                .into_iter()
                .map(|(k, v)| {
                    if let Some(alias) = aliases(k) {
                        (alias, v)
                    } else {
                        (k, v)
                    }
                })
                .collect::<BTreeMap<_, _>>();

            // Remove duplicates on keys that are not in `is_seq(key)`.
            let entries = entries
                .into_iter()
                .map(|(k, v)| {
                    if is_seq(k) {
                        (k, v)
                    } else {
                        // Last key should overtake the first key.
                        (k, vec![v[v.len() - 1]])
                    }
                })
                .collect::<BTreeMap<_, _>>();

            for (key, value) in entries {
                json.push_str(&format!("\"{}\":", key));
                if is_seq(key) {
                    json.push('[');
                    for v in value {
                        if let Some(v) = tx(key, v) {
                            json.push_str(&v);
                        } else {
                            json.push_str(&format!("{:?},", v));
                        }
                    }
                    json.pop();
                    json.push(']');
                } else if let Some(v) = tx(key, value[0]) {
                    json.push_str(&v);
                } else {
                    json.push_str(&format!("{:?}", value[0]));
                }
                json.push(',');
            }
            json
        }

        let mut json = String::with_capacity(1024);
        json.push_str("{ ");
        output_section(&self.root, &tx, &is_seq, &aliases);
        for (name, section) in self.sections() {
            json.push_str(&format!("\"{}\":{{ ", name));
            json.push_str(&output_section(section, &tx, &is_seq, &aliases));
            json.pop();
            json.push_str("},");
        }
        json.pop();
        json.push('}');
        json
    }
}

pub fn parse<'a>(mut input: &'a str) -> Result<Ini<'a>, Error> {
    let mut root_kv = Vec::new();
    let mut sections = Vec::new();
    let mut current_section: Option<(&str, Section)> = None;

    fn split_section_header(name: &str) -> impl Iterator<Item = &str> {
        name.split('+').map(str::trim)
    }

    while !input.is_empty() {
        let i = input.find('\n').unwrap_or(input.len());

        // Remove comments
        let line = &input[..i];
        let line = line.split(';').next().unwrap_or(line).trim();
        if line.is_empty() {
            input = &input[i..].strip_prefix('\n').unwrap_or("");
        } else if let Some(l) = input.strip_prefix('[') {
            // Find the `]` in the rest of the input.
            let Some((name, after_category)) = l.split_once(']') else {
                return Err(Error::ParseError("Category not closed: ".to_string() + l));
            };
            input = &after_category[1..];

            if let Some(s) = current_section.take() {
                // Split the section name and clone it if necessary.
                sections.extend(split_section_header(&s.0).map(|name| (name, s.1.clone())));
            }

            let name = name.trim();
            current_section = Some((name, Section::new()));
        } else if let Some((key, value)) = line.split_once('=') {
            if let Some(section) = current_section.as_mut() {
                section.1.push(key.trim(), value.trim());
            } else {
                root_kv.push(KeyValue {
                    key: key.trim(),
                    value: value.trim(),
                });
            }
            input = &input[i..];
        } else {
            return Err(Error::ParseError("Invalid line: ".to_string() + line));
        }
    }

    if let Some(s) = current_section.take() {
        sections.extend(split_section_header(&s.0).map(|name| (name, s.1.clone())));
    }

    Ok(Ini {
        root: Section { entries: root_kv },
        sections,
    })
}
