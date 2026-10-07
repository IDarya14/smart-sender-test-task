import { Button, Form, Input, message, Modal } from "antd";
import { useEffect, useState } from "react";
import { getWebhook, updateWebhook } from "../api.ts";
import { readFieldErrors } from "../errors.ts";
import { isHttpUrl } from "../utils.ts";

type Props = {
  webhookId: string;
  onClose: () => void;
  onSaved: () => void;
};

type WebhookValues = {
  name: string;
  url: string;
};

export default function WebhookModal({ webhookId, onClose, onSaved }: Props) {
  const [form] = Form.useForm<WebhookValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!webhookId) return;
    getWebhook(webhookId)
      .then((webhook) => {
        form.setFieldsValue({ name: webhook.name, url: webhook.url });
        setLoading(false);
      })
      .catch(() => {
        message.error("Something went wrong.");
        onClose();
      });
  }, [webhookId, form]);

  async function onFinish(values: WebhookValues) {
    setSaving(true);
    try {
      await updateWebhook(webhookId, {
        name: values.name.trim(),
        url: values.url.trim(),
      });
      onSaved();
      onClose();
    } catch (error) {
      const fields = readFieldErrors(error);
      if (!fields) return;
      form.setFields(
        Object.entries(fields).map(([name, errors]) => ({
          name: name as keyof WebhookValues,
          errors,
        })),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit webhook" open onCancel={onClose} footer={null}>
      {loading ? (
        <p className="m-0">Loading...</p>
      ) : (
        <Form<WebhookValues> form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, whitespace: true, message: "Name is required" },
            ]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true, message: "URL is required" },
              {
                validator: (_, value: string) => {
                  if (!value || isHttpUrl(value.trim()))
                    return Promise.resolve();
                  return Promise.reject(new Error("Enter a valid HTTP URL"));
                },
              },
            ]}
          >
            <Input />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
