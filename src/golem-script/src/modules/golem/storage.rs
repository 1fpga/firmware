use boa_engine::{js_string, Context, JsError, JsResult, JsString, JsValue, Module};
use boa_interop::{ContextData, IntoJsFunctionCopied, IntoJsModule};
use diesel::connection::LoadConnection;
use diesel::deserialize::FromSql;
use diesel::row::{Field, Row};
use diesel::sqlite::SqliteType;
use diesel::{RunQueryDsl, SqliteConnection};

use crate::HostData;

fn remove_(key: String, ContextData(data): ContextData<HostData>) -> JsResult<()> {
    let db = data.app_mut().database();
    let mut db = db.lock().unwrap();

    diesel::sql_query("DELETE FROM storage WHERE key = ?;")
        .bind::<diesel::sql_types::Text, _>(key)
        .execute(&mut *db)
        .map_err(|e| JsError::from_opaque(JsString::from(e.to_string()).into()))?;

    Ok(())
}

fn set_item_(
    key: String,
    value: JsValue,
    ContextData(data): ContextData<HostData>,
    context: &mut Context,
) -> JsResult<()> {
    let db = data.app_mut().database();
    let mut db = db.lock().unwrap();

    let value = value.to_string(context)?.to_std_string_escaped();

    diesel::sql_query("INSERT INTO storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .bind::<diesel::sql_types::Text, _>(key)
        .bind::<diesel::sql_types::Text, _>(value)
        .execute(&mut *db)
        .map_err(|e| JsError::from_opaque(JsString::from(e.to_string()).into()))?;

    Ok(())
}

fn get_item_(
    key: String,
    ContextData(data): ContextData<HostData>,
    context: &mut Context,
) -> JsResult<JsValue> {
    let db = data.app_mut().database();
    let mut db = db.lock().unwrap();

    let query = diesel::sql_query("SELECT value FROM storage WHERE key = ?")
        .bind::<diesel::sql_types::Text, _>(key);
    let mut cursor: <SqliteConnection as LoadConnection<_>>::Cursor<'_, '_> =
        db.load(query).map_err(|err| {
            JsError::from_opaque(
                JsString::from(format!("Database error: {}", err.to_string())).into(),
            )
        })?;

    let result = match cursor.next() {
        Some(Ok(row)) => {
            let Some(value) = row.get(0) else {
                return Ok(JsValue::undefined());
            };
            let Some(value) = value.value() else {
                return Ok(JsValue::undefined());
            };

            let json: String = match value.value_type() {
                Some(SqliteType::Text) => FromSql::<diesel::sql_types::Text, _>::from_sql(value)
                    .map_err(|e| JsError::from_opaque(JsString::from(e.to_string()).into()))?,
                _ => {
                    return Ok(JsValue::undefined());
                }
            };

            let serde_value = serde_json::from_str(&json)
                .map_err(|e| JsError::from_opaque(JsString::from(e.to_string()).into()))?;
            JsValue::from_json(&serde_value, context)
        }
        None => Ok(JsValue::undefined()),
        Some(Err(err)) => Err(JsError::from_opaque(
            JsString::from(format!("Database error: {}", err.to_string())).into(),
        )),
    };

    result
}

pub fn create_module(context: &mut Context) -> JsResult<(JsString, Module)> {
    Ok((
        js_string!("storage"),
        [
            (
                js_string!("get"),
                get_item_.into_js_function_copied(context),
            ),
            (
                js_string!("set"),
                set_item_.into_js_function_copied(context),
            ),
            (
                js_string!("remove"),
                remove_.into_js_function_copied(context),
            ),
        ]
        .into_js_module(context),
    ))
}
