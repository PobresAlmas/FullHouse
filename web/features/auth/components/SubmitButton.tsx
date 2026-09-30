import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
    text: string;
} 

export default function SubmitButton({ text }: SubmitButtonProps) {
    return (
        <Button type="submit" className="w-full bg-secondary cursor-pointer font-bold">{text}</Button>
    )
}