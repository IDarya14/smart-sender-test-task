import { Button, Form, Input } from "antd";
import { useState } from "react";
import { issueSession, login } from "../api.ts";
import { markLoggedIn } from "../authState.ts";
import { readFieldErrors } from "../errors.ts";
import { setDeviceSessionToken } from "../session.ts";

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [form] = Form.useForm<LoginValues>();
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(values: LoginValues) {
    setSubmitting(true);
    form.setFields([
      { name: "email", errors: [] },
      { name: "password", errors: [] },
    ]);

    try {
      const result = await login(values.email, values.password);
      setDeviceSessionToken(result.device_session_token);
      await issueSession();
      markLoggedIn();
    } catch (error) {
      const fields = readFieldErrors(error);
      if (fields) {
        form.setFields(
          Object.entries(fields).map(([name, errors]) => ({
            name: name as keyof LoginValues,
            errors,
          })),
        );
      } else {
        form.setFields([
          { name: "password", errors: ["Could not sign in. Try again."] },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-xl font-semibold mb-6">Sign in</h1>
        <Form<LoginValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={onFinish}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <div className="mt-10">
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              Sign in
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
