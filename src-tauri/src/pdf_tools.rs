use lopdf::{Document, Object, ObjectId, SaveOptions};
use std::collections::BTreeMap;
use std::fs::File;
use std::path::Path;

fn parse_pages_spec(spec: &str) -> Result<Vec<u32>, String> {
    let mut pages = Vec::<u32>::new();

    for part in spec.split(',') {
        let p = part.trim();
        if p.is_empty() {
            continue;
        }

        if let Some((a, b)) = p.split_once('-') {
            let start: u32 = a.trim().parse().map_err(|_| format!("Invalid page: {a}"))?;
            let end: u32 = b.trim().parse().map_err(|_| format!("Invalid page: {b}"))?;
            if start == 0 || end == 0 {
                return Err("Page numbers are 1-based".to_string());
            }
            let (s, e) = if start <= end { (start, end) } else { (end, start) };
            for n in s..=e {
                pages.push(n);
            }
        } else {
            let n: u32 = p.parse().map_err(|_| format!("Invalid page: {p}"))?;
            if n == 0 {
                return Err("Page numbers are 1-based".to_string());
            }
            pages.push(n);
        }
    }

    pages.sort_unstable();
    pages.dedup();
    Ok(pages)
}

fn merge_documents(mut documents: Vec<Document>) -> Result<Document, String> {
    if documents.is_empty() {
        return Err("No documents provided".to_string());
    }

    let mut max_id: u32 = 1;
    let mut document = Document::with_version("1.5");

    let mut documents_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut documents_objects: BTreeMap<ObjectId, Object> = BTreeMap::new();

    for doc in documents.iter_mut() {
        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        documents_pages.extend(
            doc.get_pages()
                .into_iter()
                .map(|(_, object_id)| {
                    (
                        object_id,
                        doc.get_object(object_id)
                            .map(|o| o.to_owned())
                            .unwrap_or(Object::Null),
                    )
                })
                .collect::<BTreeMap<ObjectId, Object>>(),
        );

        documents_objects.extend(doc.objects.clone());
    }

    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in documents_objects.iter() {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    if let Some((id, _)) = catalog_object { id } else { *object_id },
                    object.clone(),
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref old_object)) = pages_object {
                        if let Ok(old_dictionary) = old_object.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }
                    pages_object = Some((
                        if let Some((id, _)) = pages_object { id } else { *object_id },
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" => {}
            b"Outlines" => {}
            b"Outline" => {}
            _ => {
                document.objects.insert(*object_id, object.clone());
            }
        }
    }

    let pages_object = pages_object.ok_or("Pages root not found")?;
    for (object_id, object) in documents_pages.iter() {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", pages_object.0);
            document
                .objects
                .insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    let catalog_object = catalog_object.ok_or("Catalog root not found")?;

    if let Ok(dictionary) = pages_object.1.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", documents_pages.len() as u32);
        dictionary.set(
            "Kids",
            documents_pages
                .keys()
                .map(|object_id| Object::Reference(*object_id))
                .collect::<Vec<_>>(),
        );
        document
            .objects
            .insert(pages_object.0, Object::Dictionary(dictionary));
    }

    if let Ok(dictionary) = catalog_object.1.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", pages_object.0);
        dictionary.remove(b"Outlines");
        document
            .objects
            .insert(catalog_object.0, Object::Dictionary(dictionary));
    }

    document.trailer.set("Root", catalog_object.0);
    document.max_id = document.objects.len() as u32;
    document.renumber_objects();
    document.adjust_zero_pages();

    Ok(document)
}

pub fn pdf_merge(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    if input_paths.len() < 2 {
        return Err("Select at least 2 PDFs to merge".to_string());
    }

    let mut docs = Vec::new();
    for p in input_paths {
        let doc = Document::load(&p).map_err(|e| e.to_string())?;
        docs.push(doc);
    }

    let mut merged = merge_documents(docs)?;
    merged.compress();

    let output_path_ref = Path::new(&output_path);
    if let Some(parent) = output_path_ref.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    merged.save(output_path_ref).map_err(|e| e.to_string())?;
    Ok(output_path)
}

pub fn pdf_extract_pages(
    input_path: String,
    pages_spec: String,
    output_path: String,
) -> Result<String, String> {
    let pages = parse_pages_spec(&pages_spec)?;
    if pages.is_empty() {
        return Err("No pages selected".to_string());
    }

    let mut doc = Document::load(&input_path).map_err(|e| e.to_string())?;

    doc.renumber_objects_with(1);

    let page_map = doc.get_pages();
    let mut selected_pages: BTreeMap<ObjectId, Object> = BTreeMap::new();
    for p in pages {
        if let Some(page_id) = page_map.get(&p) {
            let obj = doc.get_object(*page_id).map_err(|e| e.to_string())?.to_owned();
            selected_pages.insert(*page_id, obj);
        }
    }

    if selected_pages.is_empty() {
        return Err("None of the requested pages exist in this document".to_string());
    }

    let mut new_doc = Document::with_version("1.5");

    let mut catalog_object: Option<(ObjectId, Object)> = None;
    let mut pages_object: Option<(ObjectId, Object)> = None;

    for (object_id, object) in doc.objects.iter() {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    if let Some((id, _)) = catalog_object { id } else { *object_id },
                    object.clone(),
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, ref old_object)) = pages_object {
                        if let Ok(old_dictionary) = old_object.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }
                    pages_object = Some((
                        if let Some((id, _)) = pages_object { id } else { *object_id },
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" => {}
            b"Outlines" => {}
            b"Outline" => {}
            _ => {
                new_doc.objects.insert(*object_id, object.clone());
            }
        }
    }

    let pages_object = pages_object.ok_or("Pages root not found")?;

    for (page_id, page_obj) in selected_pages.iter() {
        if let Ok(dictionary) = page_obj.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", pages_object.0);
            new_doc
                .objects
                .insert(*page_id, Object::Dictionary(dictionary));
        }
    }

    let catalog_object = catalog_object.ok_or("Catalog root not found")?;

    if let Ok(dictionary) = pages_object.1.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", selected_pages.len() as u32);
        dictionary.set(
            "Kids",
            selected_pages
                .keys()
                .map(|object_id| Object::Reference(*object_id))
                .collect::<Vec<_>>(),
        );
        new_doc
            .objects
            .insert(pages_object.0, Object::Dictionary(dictionary));
    }

    if let Ok(dictionary) = catalog_object.1.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", pages_object.0);
        dictionary.remove(b"Outlines");
        new_doc
            .objects
            .insert(catalog_object.0, Object::Dictionary(dictionary));
    }

    new_doc.trailer.set("Root", catalog_object.0);
    new_doc.max_id = new_doc.objects.len() as u32;
    new_doc.renumber_objects();
    new_doc.adjust_zero_pages();

    new_doc.compress();

    let output_path_ref = Path::new(&output_path);
    if let Some(parent) = output_path_ref.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    new_doc.save(output_path_ref).map_err(|e| e.to_string())?;
    Ok(output_path)
}

pub fn pdf_compress(
    input_path: String,
    output_path: String,
    compression_level: Option<u8>,
) -> Result<String, String> {
    let mut doc = Document::load(&input_path).map_err(|e| e.to_string())?;

    let output_path_ref = Path::new(&output_path);
    if let Some(parent) = output_path_ref.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    doc.compress();

    let level = compression_level.unwrap_or(9).min(9);
    let options = SaveOptions::builder()
        .use_object_streams(true)
        .use_xref_streams(true)
        .compression_level(level.into())
        .build();

    let mut file = File::create(output_path_ref).map_err(|e| e.to_string())?;
    doc.save_with_options(&mut file, options)
        .map_err(|e| e.to_string())?;

    Ok(output_path)
}

pub fn pdf_to_markdown(input_path: String, output_path: String) -> Result<String, String> {
    let doc = Document::load(&input_path).map_err(|e| e.to_string())?;
    let pages = doc.get_pages();
    let page_numbers: Vec<u32> = pages.keys().cloned().collect();

    let text = doc.extract_text(&page_numbers).map_err(|e| e.to_string())?;

    let out_path = Path::new(&output_path);
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let md = format!("{}\n", text);
    std::fs::write(out_path, md).map_err(|e| e.to_string())?;

    Ok(output_path)
}
