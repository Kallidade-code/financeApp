using System.ComponentModel.DataAnnotations;

namespace financeApp.Models;

public class Categoria
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O nome da categoria é obrigatório.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 100 caracteres.")]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O tipo da categoria é obrigatório.")]
    public TipoTransacao Tipo { get; set; }

    public List<Transacao> Transacoes { get; set; } = new List<Transacao>();

    public Categoria() { }

    public Categoria(string nome, TipoTransacao tipo)
    {
        Nome = nome;
        Tipo = tipo;
    }
}
