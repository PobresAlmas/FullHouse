import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
    text: string;
    disabled?: boolean;
}

export default function SubmitButton({ text, disabled = false }: SubmitButtonProps) {
    return (
        <Button
            type="submit"
            disabled={disabled}
            className="w-full bg-secondary cursor-pointer font-bold"
        >
            {text}
        </Button>
    );
}
