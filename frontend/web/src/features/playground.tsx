import { useState } from "react";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import SearchableSelect from "../components/ui/SearchableSelect";
import Checkbox from "../components/ui/Checkbox";
import Textarea from "../components/ui/Textarea";
import Radio from "../components/ui/Radio";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";
import Stepper from "../components/ui/Stepper";
import Table from "../components/ui/Table";
import Tabs from "../components/ui/Tabs";
import Loader from "../components/ui/Loader";

import Pagination from "../components/ui/Pagination";
import Menu from "../components/ui/Menu";
import EmptyState from "../components/ui/EmptyState";

export default function Playground() {

  const [modalOpen, setModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [page, setPage] = useState(1);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

return (
  <div className="min-h-screen bg-background text-text">

    {/* Header */}
    <div className="sticky top-0 z-40 bg-background border-b border-gray-200 px-10 py-4">
      <h1 className="text-2xl font-bold">UI Playground</h1>
      <p className="text-sm text-gray-500">
        Design system components preview
      </p>
    </div>

    <div className="p-10 space-y-12">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      {/* ================= FORMS ================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Form Components</h2>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          <Card title="Inputs">
            <div className="space-y-3">
              <Input label="Email" placeholder="Enter email" />
              <Input label="Password" type="password" />
              <Input label="With Error" error="Required field" />
            </div>
          </Card>

          <Card title="Select">
            <div className="space-y-3">
              <Select
                label="Gender"
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                ]}
              />
              <SearchableSelect
                label="College"
                options={[
                  { label: "Bangalore", value: 1 },
                  { label: "Mysore", value: 2 },
                ]}
                onChange={() => {}}
              />
            </div>
          </Card>

          <Card title="Controls">
            <div className="space-y-3">
              <Checkbox label="Accept Terms" />
             <Radio
                label="Select Option"
                name="r"
                options={[
                  { label: "Option A", value: "a" },
                  { label: "Option B", value: "b" },
                ]}
              />
              <Textarea label="Description" />
            </div>
          </Card>

        </div>
      </section>

      {/* ================= BUTTONS ================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Buttons</h2>

        <Card>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="outline">Outline</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
      </section>

      {/* ================= FEEDBACK ================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Feedback</h2>

        <div className="grid md:grid-cols-2 gap-6">

          <Card title="Loader">
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          </Card>

          <Card title="Toast">
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => showToast("Success", "success")}>
                Success
              </Button>
              <Button onClick={() => showToast("Error", "error")}>
                Error
              </Button>
            </div>
          </Card>

        </div>
      </section>

      {/* ================= DATA DISPLAY ================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Data Display</h2>

        <Card title="Table">
          <Table
            selectable
            columns={[
              { header: "App No", accessor: "appNo" },
              { header: "Name", accessor: "name" },
            ]}
            data={[
              { appNo: "APP001", name: "Rahul" },
              { appNo: "APP002", name: "Ananya" },
            ]}
          />

          <Pagination
            page={page}
            totalPages={5}
            onPageChange={setPage}
          />
        </Card>

        <Card title="Empty State">
          <EmptyState
            title="No Data"
            description="Nothing here yet"
          />
        </Card>

      </section>

      {/* ================= NAVIGATION ================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Navigation</h2>

        <Card title="Tabs">
          <Tabs
            tabs={[
              { label: "Tab 1", value: "1", content: <p>Content 1</p> },
              { label: "Tab 2", value: "2", content: <p>Content 2</p> },
            ]}
          />
        </Card>

        <Card title="Stepper">
          <Stepper
            currentStep={2}
            steps={[
              { label: "Step 1" },
              { label: "Step 2" },
              { label: "Step 3" },
            ]}
          />
        </Card>

        <Card title="Menu">
          <Menu
            items={[
              { label: "Edit", onClick: () => {} },
              { label: "Delete", onClick: () => {} },
            ]}
          />
        </Card>

      </section>

    </div>

    {/* Modal */}
    <Modal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      title="Example Modal"
    >
      <p className="text-sm mb-4">This is a modal example.</p>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setModalOpen(false)}>
          Cancel
        </Button>
        <Button>Confirm</Button>
      </div>
    </Modal>

  </div>
);
}