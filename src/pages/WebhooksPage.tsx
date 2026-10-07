import { Button, Form, Input, message, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { endSession, getMe, getWebhooks, revoke } from "../api.ts";
import WebhookModal from "../components/WebhookModal.tsx";
import { useDebounce } from "../useDebounce.ts";
import type { User, Webhook, WebhookList } from "../types.ts";

function readPage(params: URLSearchParams) {
  const value = Number(params.get("page"));
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function withListQuery(
  current: URLSearchParams,
  patch: { page?: number; search?: string },
) {
  const next = new URLSearchParams(current);
  if (patch.search !== undefined) {
    const trimmed = patch.search.trim();
    if (trimmed) next.set("search", trimmed);
    else next.delete("search");
    next.set("page", "1");
  }
  if (patch.page !== undefined) next.set("page", String(patch.page));
  return next;
}

export default function WebhooksPage() {
  const [params, setParams] = useSearchParams();
  const page = readPage(params);
  const search = params.get("search") ?? "";
  const [form] = Form.useForm<{ search: string }>();
  const searchText = Form.useWatch("search", form);
  const debouncedSearch = useDebounce(searchText, 300);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [list, setList] = useState<WebhookList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user);
      })
      .catch(() => {
        message.error("Something went wrong.");
      });
  }, []);

  const loadWebhooks = useCallback(() => {
    setLoading(true);
    getWebhooks(page, search)
      .then((next) => {
        setList(next);
      })
      .catch(() => {
        message.error("Something went wrong.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, search]);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  const applySearch = useCallback(
    (value: string) => {
      setParams((prev) => withListQuery(prev, { search: value }));
    },
    [setParams],
  );

  useEffect(() => {
    const current = String(form.getFieldValue("search") ?? "").trim();
    if (current === search) return;
    form.setFieldsValue({ search });
  }, [search, form]);

  useEffect(() => {
    if (debouncedSearch === undefined || debouncedSearch.trim() === search) return;
    applySearch(debouncedSearch);
  }, [debouncedSearch, search, applySearch]);

  async function logout() {
    setLoggingOut(true);
    try {
      await revoke();
    } finally {
      endSession();
    }
  }

  const columns: ColumnsType<Webhook> = [
    { title: "Name", dataIndex: "name" },
    { title: "URL", dataIndex: "url", ellipsis: true },
    {
      title: "Active",
      dataIndex: "active",
      width: 110,
      render: (active: boolean) => (active ? "Yes" : "No"),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_, row) => (
        <Button type="link" onClick={() => setEditingId(row.id)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-0 border-b border-solid border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-end gap-4">
          <span className="text-sm text-slate-600">{me?.name}</span>
          <Button onClick={logout} loading={loggingOut}>
            Log out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-lg font-semibold m-0">Webhooks</h1>
          <Form form={form} component={false} initialValues={{ search }}>
            <Form.Item name="search" noStyle>
              <Input.Search
                allowClear
                placeholder="Search by name"
                onSearch={applySearch}
                style={{ width: 280 }}
              />
            </Form.Item>
          </Form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <Table<Webhook>
            rowKey="id"
            columns={columns}
            dataSource={list?.data ?? []}
            loading={loading}
            locale={{
              emptyText: search
                ? "No webhooks match this search"
                : "No webhooks",
            }}
            pagination={{
              current: page,
              pageSize: list?.paging.results.limitation ?? 10,
              total: list?.paging.results.total ?? 0,
              showSizeChanger: false,
              onChange: (nextPage) => setParams((prev) => withListQuery(prev, { page: nextPage })),
            }}
          />
        </div>
      </main>

      {editingId ? (
        <WebhookModal
          key={editingId}
          webhookId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={loadWebhooks}
        />
      ) : null}
    </div>
  );
}
